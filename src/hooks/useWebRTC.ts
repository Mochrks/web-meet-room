/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useWebRTC – manages peer connections for camera + screen-share streams.
 *
 * Design:
 *  • Each remote user gets ONE RTCPeerConnection.
 *  • The local camera stream is added as default tracks.
 *  • When screen sharing starts, we renegotiate by replacing the video
 *    track on all existing peers AND adding a second "screen" video track
 *    via addTrack → renegotiation.  The remote side labels the second
 *    video track as screen-share based on stream id.
 *  • When screen sharing stops we remove the screen track and
 *    restore camera track → renegotiation.
 */

import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '@/shared/socket';
import { useRoomStore } from '@/store/useRoomStore';
import { ICE_SERVERS, SCREEN_STREAM_PREFIX } from '@/constants/webrtc';



export function useWebRTC() {
  const {
    localStream,
    screenStream,
    addParticipant,
    removeParticipant,
    updateParticipant,
    addRemoteStream,
    removeRemoteStream,
    addScreenShareStream,
    removeScreenShareStream,
    addMessage,
    setPinnedId,
  } = useRoomStore();

  // Refs survive re-renders
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const ignoreOfferRef = useRef<Map<string, boolean>>(new Map());

  // Keep refs in sync with store
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { screenStreamRef.current = screenStream; }, [screenStream]);

  /* ── helpers ───────────────────────────────────────────────── */

  const createPeerConnection = useCallback((remoteSocketId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket().emit('signal', {
          to: remoteSocketId,
          signal: { type: 'candidate', candidate: e.candidate },
        });
      }
    };

    // Separate camera vs screen streams based on stream id
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (!stream) return;

      if (stream.id.startsWith(SCREEN_STREAM_PREFIX)) {
        addScreenShareStream(remoteSocketId, stream);
        setPinnedId(remoteSocketId);
      } else {
        addRemoteStream(remoteSocketId, stream);
      }

      // when tracks end, clean up
      e.track.onended = () => {
        if (stream.id.startsWith(SCREEN_STREAM_PREFIX)) {
          removeScreenShareStream(remoteSocketId);
        }
      };
    };

    pc.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current.set(remoteSocketId, true);
        const offer = await pc.createOffer();
        // check if state changed inside createOffer
        if (pc.signalingState !== "stable") return;
        await pc.setLocalDescription(offer);
        getSocket().emit('signal', {
          to: remoteSocketId,
          signal: { type: 'offer', sdp: pc.localDescription },
        });
      } catch (err) {
        console.error('negotiation error', err);
      } finally {
        makingOfferRef.current.set(remoteSocketId, false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        pc.restartIce();
      }
    };

    // Add local camera tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Add screen-share tracks if currently sharing
    if (screenStreamRef.current) {
      const screenId = SCREEN_STREAM_PREFIX + screenStreamRef.current.id;
      const labeledStream = new MediaStream(screenStreamRef.current.getTracks());
      Object.defineProperty(labeledStream, 'id', { value: screenId });
      screenStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, labeledStream);
      });
    }

    peersRef.current.set(remoteSocketId, pc);
    return pc;
  }, [addRemoteStream, addScreenShareStream, removeScreenShareStream, setPinnedId]);

  /* ── flush pending ICE candidates ────────────────────────── */
  const flushCandidates = useCallback(async (sid: string, pc: RTCPeerConnection) => {
    const pending = pendingCandidatesRef.current.get(sid);
    if (pending) {
      for (const c of pending) {
        try { await pc.addIceCandidate(c); } catch { /* skip */ }
      }
      pendingCandidatesRef.current.delete(sid);
    }
  }, []);

  /* ── socket listeners ──────────────────────────────────────── */

  useEffect(() => {
    const socket = getSocket();

    // --- Existing users already in room when we join ---
    const onRoomUsers = (users: { socketId: string; user: any }[]) => {
      users.forEach(({ socketId, user }) => {
        addParticipant({
          socketId,
          name: user.name,
          hasAudio: user.hasAudio ?? true,
          hasVideo: user.hasVideo ?? true,
          isScreenSharing: user.isScreenSharing ?? false,
        });
        // We are the newcomer → we create offers to every existing user
        createPeerConnection(socketId);
      });
    };

    // --- A new user joined AFTER us ---
    const onUserJoined = ({ socketId, user }: { socketId: string; user: any }) => {
      addParticipant({
        socketId,
        name: user.name,
        hasAudio: user.hasAudio ?? true,
        hasVideo: user.hasVideo ?? true,
        isScreenSharing: user.isScreenSharing ?? false,
      });
      addMessage({
        id: `sys-${Date.now()}`,
        senderSocketId: '',
        senderName: '',
        text: `${user.name} joined the meeting`,
        timestamp: Date.now(),
        type: 'system',
      });
      // Don't create PC here; the newcomer will send offers to us.
      // But we still need a PC ready to answer, so create one without initiating.
      if (!peersRef.current.has(socketId)) {
        createPeerConnection(socketId);
      }
    };

    // --- A user left ---
    const onUserLeft = (socketId: string) => {
      const p = useRoomStore.getState().participants.get(socketId);
      if (p) {
        addMessage({
          id: `sys-${Date.now()}`,
          senderSocketId: '',
          senderName: '',
          text: `${p.name} left the meeting`,
          timestamp: Date.now(),
          type: 'system',
        });
      }
      removeParticipant(socketId);
      removeRemoteStream(socketId);
      removeScreenShareStream(socketId);
      const pc = peersRef.current.get(socketId);
      if (pc) { pc.close(); peersRef.current.delete(socketId); }
    };

    // --- WebRTC signaling ---
    const onSignal = async ({ from, signal }: { from: string; signal: any }) => {
      let pc = peersRef.current.get(from);
      const polite = socket.id ? socket.id > from : false;
      let ignoreOffer = ignoreOfferRef.current.get(from) || false;

      if (signal.type === 'offer') {
        if (!pc) pc = createPeerConnection(from);

        const offerCollision =
          makingOfferRef.current.get(from) ||
          pc.signalingState !== 'stable';

        ignoreOffer = !polite && offerCollision;
        ignoreOfferRef.current.set(from, ignoreOffer);

        if (ignoreOffer) {
          return;
        }

        // Always rollback first if polite and there's a collision 
        if (offerCollision) {
          await Promise.all([
             pc.setLocalDescription({ type: 'rollback' } as any)
          ]).catch(e => console.warn('Rollback failed', e));
        }

        await pc.setRemoteDescription(signal.sdp);
        await flushCandidates(from, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal', {
          to: from,
          signal: { type: 'answer', sdp: pc.localDescription },
        });
      } else if (signal.type === 'answer') {
        if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(signal.sdp);
          await flushCandidates(from, pc);
        }
      } else if (signal.type === 'candidate') {
        if (pc && pc.remoteDescription) {
          try { await pc.addIceCandidate(signal.candidate); } catch { /* */ }
        } else {
          // Queue it
          if (!pendingCandidatesRef.current.has(from)) {
            pendingCandidatesRef.current.set(from, []);
          }
          pendingCandidatesRef.current.get(from)!.push(signal.candidate);
        }
      }
    };

    // --- Media state from remote ---
    const onMediaState = ({ socketId, ...state }: any) => {
      updateParticipant(socketId, state);
    };

    // --- Chat ---
    const onChatMessage = (msg: any) => {
      addMessage(msg);
    };

    socket.on('room-users', onRoomUsers);
    socket.on('user-joined', onUserJoined);
    socket.on('user-left', onUserLeft);
    socket.on('signal', onSignal);
    socket.on('media-state', onMediaState);
    socket.on('chat-message', onChatMessage);

    return () => {
      socket.off('room-users', onRoomUsers);
      socket.off('user-joined', onUserJoined);
      socket.off('user-left', onUserLeft);
      socket.off('signal', onSignal);
      socket.off('media-state', onMediaState);
      socket.off('chat-message', onChatMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Replace camera track on all peers ─────────────────────── */
  const replaceCameraTrack = useCallback((newTrack: MediaStreamTrack | null) => {
    peersRef.current.forEach((pc) => {
      const sender = pc.getSenders().find(
        (s) => s.track?.kind === newTrack?.kind && !s.track?.label.includes('screen')
      );
      if (sender && newTrack) {
        sender.replaceTrack(newTrack);
      }
    });
  }, []);

  /* ── Add screen-share tracks to every peer ─────────────────── */
  const addScreenTracks = useCallback((screenMediaStream: MediaStream) => {
    const screenId = SCREEN_STREAM_PREFIX + screenMediaStream.id;
    const labeledStream = new MediaStream(screenMediaStream.getTracks());
    // Override stream id for labeling
    Object.defineProperty(labeledStream, 'id', { value: screenId });

    peersRef.current.forEach((pc) => {
      screenMediaStream.getTracks().forEach((track) => {
        pc.addTrack(track, labeledStream);
      });
    });
  }, []);

  /* ── Remove screen-share tracks from every peer ────────────── */
  const removeScreenTracks = useCallback((screenMediaStream: MediaStream) => {
    peersRef.current.forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track && screenMediaStream.getTracks().includes(sender.track)) {
          pc.removeTrack(sender);
        }
      });
    });
  }, []);

  /* ── Clean up all peers ────────────────────────────────────── */
  const destroyAllPeers = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    makingOfferRef.current.clear();
    pendingCandidatesRef.current.clear();
    ignoreOfferRef.current.clear();
  }, []);

  return {
    replaceCameraTrack,
    addScreenTracks,
    removeScreenTracks,
    destroyAllPeers,
  };
}

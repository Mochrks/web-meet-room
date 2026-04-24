'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoomStore } from '@/store/useRoomStore';
import { getSocket, disconnectSocket } from '@/shared/socket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoGrid } from '@/components/VideoGrid';
import { ChatPanel } from '@/components/ChatPanel';
import { ParticipantsList } from '@/components/ParticipantsList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Users, 
  MessageSquare, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  MonitorUp, 
  PhoneOff,
  Info,
  Copy,
  Check
} from 'lucide-react';

export function RoomClient({ roomId }: { roomId: string }) {
  const {
    setUserName,
    joined,
    setJoined,
    setRoomId,
    localStream,
    setLocalStream,
    hasAudio,
    setHasAudio,
    hasVideo,
    setHasVideo,
    isScreenSharing,
    setIsScreenSharing,
    screenStream,
    setScreenStream,
    sidebarTab,
    setSidebarTab,
    reset
  } = useRoomStore();

  const [nameInput, setNameInput] = useState('');
  const [mounted, setMounted] = useState(false);
  const [copiedInfo, setCopiedInfo] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setMounted(true); }, []);

  const { replaceCameraTrack, addScreenTracks, removeScreenTracks, destroyAllPeers } = useWebRTC();

  useEffect(() => {
    return () => {
      const sock = getSocket();
      if (sock && useRoomStore.getState().joined) {
          sock.emit('leave-room');
      }
      useRoomStore.getState().localStream?.getTracks().forEach((t) => t.stop());
      useRoomStore.getState().screenStream?.getTracks().forEach((t) => t.stop());
      destroyAllPeers();
      disconnectSocket();
      reset();
    };
  }, [destroyAllPeers, reset]);

  /* ── Join Handlers ─────────────────────────────────────────── */
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setUserName(nameInput.trim());
      setRoomId(roomId);
      setJoined(true);

      const socket = getSocket();
      socket.connect(); // Actually connect now
      
      socket.emit('join-room', {
        roomId,
        user: {
          name: nameInput.trim(),
          hasAudio: true,
          hasVideo: true,
          isScreenSharing: false,
        }
      });
    } catch (err) {
      console.error("Failed to default camera", err);
      alert("Microphone & Camera permission denied. Features will be limited.");
      // Join anyway without initial cam
      setUserName(nameInput.trim());
      setRoomId(roomId);
      setJoined(true);
      const socket = getSocket();
      socket.connect();
      socket.emit('join-room', {
        roomId,
        user: { name: nameInput.trim(), hasAudio: false, hasVideo: false, isScreenSharing: false }
      });
      setHasAudio(false);
      setHasVideo(false);
    }
  };

  /* ── Media Toggles ─────────────────────────────────────────── */
  const toggleAudio = () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setHasAudio(track.enabled);
        getSocket().emit('media-state', { hasAudio: track.enabled });
      }
    } else {
        // Fallback to try capturing just audio
       navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
           const current = useRoomStore.getState().localStream || new MediaStream();
           current.addTrack(stream.getAudioTracks()[0]);
           setLocalStream(current);
           setHasAudio(true);
           getSocket().emit('media-state', { hasAudio: true });
           replaceCameraTrack(stream.getAudioTracks()[0]); // Just to sync audio track if we added it late
       })
    }
  };

  const toggleVideo = async () => {
    if (localStream && localStream.getVideoTracks().length > 0) {
      const track = localStream.getVideoTracks()[0];
      track.enabled = !track.enabled;
      setHasVideo(track.enabled);
      getSocket().emit('media-state', { hasVideo: track.enabled });
    } else {
       // if we didn't have video initially
       try {
           const stream = await navigator.mediaDevices.getUserMedia({ video: true });
           const current = useRoomStore.getState().localStream || new MediaStream();
           const newVideoTrack = stream.getVideoTracks()[0];
           current.addTrack(newVideoTrack);
           setLocalStream(current);
           setHasVideo(true);
           getSocket().emit('media-state', { hasVideo: true });
           replaceCameraTrack(newVideoTrack); // Renegotiate / replace logic for video
       } catch (e) {
           console.error("Could not start video", e);
       }
    }
  };

  /* ── Screen Share ──────────────────────────────────────────── */
  const handleScreenShare = async () => {
    if (isScreenSharing && screenStream) {
      // Stop
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      getSocket().emit('media-state', { isScreenSharing: false });
      removeScreenTracks(screenStream);
    } else {
      // Start
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        
        // Listen for the browser "Stop sharing" button
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
          getSocket().emit('media-state', { isScreenSharing: false });
          removeScreenTracks(stream);
        };

        setScreenStream(stream);
        setIsScreenSharing(true);
        getSocket().emit('media-state', { isScreenSharing: true });
        addScreenTracks(stream);
      } catch (err) {
        console.error("Screen share cancelled", err);
      }
    }
  };

  const handleLeave = () => {
    const socket = getSocket();
    if (socket) socket.emit('leave-room');
    
    // Hard teardown of hardware streams
    useRoomStore.getState().localStream?.getTracks().forEach((t) => t.stop());
    useRoomStore.getState().screenStream?.getTracks().forEach((t) => t.stop());
    destroyAllPeers();
    disconnectSocket();
    
    // We use a full redirect instead of router.push to completely flush 
    // the React/Next.js memory store so old socket callbacks aren't preserved!
    window.location.href = '/';
  };

  const copyUrl = () => {
      navigator.clipboard.writeText(window.location.href);
      setCopiedInfo(true);
      setTimeout(() => setCopiedInfo(false), 2000);
  }

  if (!mounted) return null;

  /* ── Join Dialog ───────────────────────────────────────────── */
  if (!joined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <Dialog open={true}>
            <DialogContent className="sm:max-w-md bg-[#1a1a2e] text-white border-white/10 shadow-2xl">
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold tracking-tight mb-2">Ready to join?</DialogTitle>
                <DialogDescription className="text-white/60">
                    No one can see you until you join. Room: <span className="font-mono text-white/80 select-all">{roomId}</span>
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleJoin} className="space-y-6 mt-4">
                <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Your Name</label>
                <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your name"
                    className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus-visible:ring-indigo-500 transition-all"
                    autoFocus
                    required
                />
                </div>
                <Button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-semibold text-md rounded-xl transition-all shadow-lg shadow-indigo-500/20">
                Join Meeting
                </Button>
            </form>
            </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ── Active Meeting View ───────────────────────────────────── */
  return (
    <div className="flex flex-col h-screen w-full bg-black overflow-hidden font-sans">
      
      {/* Top Header / Info */}
      <div className="absolute top-4 left-4 z-50 flex items-center space-x-3 transition-opacity hover:opacity-100 opacity-60 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl">
         <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm border border-indigo-500/50">W</div>
         <div className="hidden sm:block">
            <h1 className="text-white font-medium text-sm tracking-wide">Web Meet</h1>
            <p className="text-white/50 text-xs flex items-center gap-2 font-mono">
                {roomId} 
            </p>
         </div>
      </div>

      <div className="absolute top-4 right-4 z-50">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsDetailsOpen(true)}
            className="bg-black/40 backdrop-blur-md text-white/80 hover:text-white hover:bg-white/10 rounded-full h-10 px-4 transition-all"
          >
             <Info size={16} className="mr-2"/>
             Meeting details
          </Button>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md bg-[#1a1a2e] text-white border-white/10 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Meeting details</DialogTitle>
            <DialogDescription className="text-white/60">
              Share this information with people you want in the meeting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Joining info</label>
              <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl group hover:border-indigo-500/50 transition-all">
                <p className="flex-1 text-sm font-mono truncate text-white/80">{typeof window !== 'undefined' ? window.location.href : ''}</p>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={copyUrl}
                  className="h-8 w-8 text-white/60 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg"
                >
                  {copiedInfo ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Meeting ID</label>
              <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl group hover:border-indigo-500/50 transition-all">
                <p className="flex-1 text-sm font-mono text-white/80 tracking-widest uppercase">{roomId}</p>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    navigator.clipboard.writeText(roomId);
                    setCopiedInfo(true);
                    setTimeout(() => setCopiedInfo(false), 2000);
                  }}
                  className="h-8 w-8 text-white/60 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg"
                >
                  {copiedInfo ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className={`flex-1 transition-all duration-300 relative flex flex-col pt-16 pb-20`}>
          <VideoGrid />
        </div>

        {/* Sidebar */}
        {sidebarTab && (
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-80 h-full flex-shrink-0 animate-in slide-in-from-right-10 border-l border-white/10 bg-[#1a1a2e] z-40 sm:relative">
            {sidebarTab === 'chat' ? <ChatPanel /> : <ParticipantsList />}
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-2 sm:gap-3 bg-[#1e1e2e]/90 backdrop-blur-xl border border-white/10 px-4 sm:px-6 py-3 rounded-full shadow-2xl overflow-x-auto max-w-[95vw]">
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleAudio}
            className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex-shrink-0 transition-all ${
                hasAudio 
                ? 'bg-white/10 text-white hover:bg-white/20' 
                : 'bg-red-500/80 text-white hover:bg-red-500 backdrop-blur border border-red-400/50'
            }`}
          >
            {hasAudio ? <Mic size={20} /> : <MicOff size={20} />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVideo}
            className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex-shrink-0 transition-all ${
                hasVideo 
                ? 'bg-white/10 text-white hover:bg-white/20' 
                : 'bg-red-500/80 text-white hover:bg-red-500 backdrop-blur border border-red-400/50'
            }`}
          >
            {hasVideo ? <Video size={20} /> : <VideoOff size={20} />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleScreenShare}
            className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex-shrink-0 transition-all flex ${
                isScreenSharing
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <MonitorUp size={20} />
          </Button>

          <div className="w-px h-8 bg-white/10 mx-1 sm:mx-2 hidden sm:block" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarTab(sidebarTab === 'people' ? null : 'people')}
            className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex-shrink-0 transition-all flex ${
                sidebarTab === 'people' ? 'bg-white/20 text-white' : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Users size={20} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarTab(sidebarTab === 'chat' ? null : 'chat')}
            className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex-shrink-0 transition-all flex ${
                sidebarTab === 'chat' ? 'bg-white/20 text-white' : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <MessageSquare size={20} />
          </Button>
          
          <Button
            variant="destructive"
            onClick={handleLeave}
            className="h-10 sm:h-12 px-4 sm:px-6 rounded-full flex-shrink-0 font-semibold ml-1 sm:ml-2 shadow-lg hover:bg-red-600 transition-all border border-red-500"
          >
            <PhoneOff className="sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Leave</span>
          </Button>
      </div>

    </div>
  );
}

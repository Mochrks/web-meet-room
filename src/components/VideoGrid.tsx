'use client';

import React from 'react';
import { useRoomStore } from '@/store/useRoomStore';
import { VideoTile } from './VideoTile';

/**
 * Google-Meet-style layout:
 *  • If anyone is screen-sharing → featured/pinned layout:
 *      – large screen-share in center
 *      – camera tiles in a sidebar strip
 *  • Otherwise → even grid of camera tiles
 */
export function VideoGrid() {
  const {
    localStream,
    screenStream,
    userName,
    hasAudio,
    hasVideo,
    isScreenSharing,
    participants,
    remoteStreams,
    screenShareStreams,
    pinnedId,
    setPinnedId,
  } = useRoomStore();

  /* ── Collect all tiles ─────────────────────────────────────── */
  type TileData = {
    key: string;
    stream: MediaStream | null;
    name: string;
    isLocal: boolean;
    isMuted: boolean;
    isVideoOff: boolean;
    isScreen: boolean;
  };

  const cameraTiles: TileData[] = [];
  const screenTiles: TileData[] = [];

  // Local camera
  cameraTiles.push({
    key: 'local-cam',
    stream: localStream,
    name: userName || 'You',
    isLocal: true,
    isMuted: !hasAudio,
    isVideoOff: !hasVideo,
    isScreen: false,
  });

  // Local screen share
  if (isScreenSharing && screenStream) {
    screenTiles.push({
      key: 'local-screen',
      stream: screenStream,
      name: userName || 'You',
      isLocal: true,
      isMuted: false,
      isVideoOff: false,
      isScreen: true,
    });
  }

  // Remote participants
  participants.forEach((p, sid) => {
    cameraTiles.push({
      key: `remote-cam-${sid}`,
      stream: remoteStreams.get(sid) || null,
      name: p.name,
      isLocal: false,
      isMuted: !p.hasAudio,
      isVideoOff: !p.hasVideo,
      isScreen: false,
    });

    const ss = screenShareStreams.get(sid);
    if (ss) {
      screenTiles.push({
        key: `remote-screen-${sid}`,
        stream: ss,
        name: p.name,
        isLocal: false,
        isMuted: false,
        isVideoOff: false,
        isScreen: true,
      });
    }
  });

  const hasScreenShare = screenTiles.length > 0;

  /* ── Grid classes ──────────────────────────────────────────── */
  const gridCols = (count: number) => {
    if (count <= 1) return '';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    return 'grid-cols-2 lg:grid-cols-3';
  };

  /* ── Featured (screen share) layout ────────────────────────── */
  if (hasScreenShare) {
    return (
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden">
        {/* Main featured area */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {screenTiles.map((t) => (
            <VideoTile
              key={t.key}
              stream={t.stream}
              name={t.name}
              isLocal={t.isLocal}
              isMuted={t.isMuted}
              isVideoOff={t.isVideoOff}
              isScreen={t.isScreen}
              className="flex-1 min-h-0"
            />
          ))}
        </div>

        {/* Side strip of camera tiles */}
        <div className="flex lg:flex-col gap-2 lg:w-56 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden flex-shrink-0 pb-1 lg:pb-0">
          {cameraTiles.map((t) => (
            <VideoTile
              key={t.key}
              stream={t.stream}
              name={t.name}
              isLocal={t.isLocal}
              isMuted={t.isMuted}
              isVideoOff={t.isVideoOff}
              isScreen={false}
              className="aspect-video w-40 lg:w-full flex-shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Equal grid layout ─────────────────────────────────────── */
  return (
    <div className="flex-1 p-3 overflow-hidden">
      <div
        className={`grid ${gridCols(cameraTiles.length)} gap-3 h-full auto-rows-fr`}
      >
        {cameraTiles.map((t) => (
          <VideoTile
            key={t.key}
            stream={t.stream}
            name={t.name}
            isLocal={t.isLocal}
            isMuted={t.isMuted}
            isVideoOff={t.isVideoOff}
            isScreen={false}
            onPin={() => setPinnedId(t.key)}
            isPinned={pinnedId === t.key}
            className="w-full h-full min-h-0"
          />
        ))}
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useRef } from 'react';
import { MicOff, Pin } from 'lucide-react';

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreen?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
  className?: string;
}

export function VideoTile({
  stream,
  name,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  isScreen = false,
  isPinned = false,
  onPin,
  className = '',
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  const showAvatar = isVideoOff || !stream;

  // Random but deterministic color based on name
  const hue = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className={`group relative rounded-xl overflow-hidden bg-[#1a1a2e] transition-all duration-300 ${className}`}
    >
      {/* video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`absolute inset-0 w-full h-full object-cover ${
          isLocal && !isScreen ? 'scale-x-[-1]' : ''
        } ${showAvatar ? 'invisible' : ''}`}
      />

      {/* avatar fallback */}
      {showAvatar && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-semibold text-white shadow-xl"
            style={{ background: `hsl(${hue}, 55%, 45%)` }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* overlay gradient for bottom info */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

      {/* bottom bar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-3 py-2 z-10">
        <div className="flex items-center gap-1.5 min-w-0">
          {isMuted && (
            <span className="flex-shrink-0 bg-red-500 rounded-full p-1">
              <MicOff size={12} className="text-white" />
            </span>
          )}
          <span className="text-xs sm:text-sm font-medium text-white truncate drop-shadow-md">
            {name}{isLocal ? ' (You)' : ''}{isScreen ? ' — Screen' : ''}
          </span>
        </div>

        {onPin && (
          <button
            onClick={onPin}
            className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md ${
              isPinned ? 'bg-indigo-500 text-white' : 'bg-white/20 backdrop-blur text-white hover:bg-white/30'
            }`}
          >
            <Pin size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

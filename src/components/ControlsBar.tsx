import React from 'react';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ControlsBarProps {
  hasAudio: boolean;
  hasVideo: boolean;
  isScreenSharing: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  leaveRoom: () => void;
}

export function ControlsBar({
  hasAudio,
  hasVideo,
  isScreenSharing,
  toggleAudio,
  toggleVideo,
  toggleScreenShare,
  leaveRoom
}: ControlsBarProps) {
  return (
    <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-center space-x-4 px-6 w-full">
      <Button
        variant={hasAudio ? "secondary" : "destructive"}
        size="icon"
        className="h-12 w-12 rounded-full"
        onClick={toggleAudio}
      >
        {hasAudio ? <Mic size={24} /> : <MicOff size={24} />}
      </Button>

      <Button
        variant={hasVideo ? "secondary" : "destructive"}
        size="icon"
        className="h-12 w-12 rounded-full"
        onClick={toggleVideo}
      >
        {hasVideo ? <Video size={24} /> : <VideoOff size={24} />}
      </Button>

      <Button
        variant={isScreenSharing ? "default" : "secondary"}
        size="icon"
        className="h-12 w-12 rounded-full hidden sm:flex"
        onClick={toggleScreenShare}
      >
        <MonitorUp size={24} />
      </Button>

      <Button
        variant="destructive"
        className="h-12 px-6 rounded-full font-semibold"
        onClick={leaveRoom}
      >
        <PhoneOff className="mr-2 h-5 w-5" />
        Leave
      </Button>
    </div>
  );
}

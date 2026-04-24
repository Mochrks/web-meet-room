import React from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRoomStore } from '@/store/useRoomStore';

export function ParticipantsList() {
  const { userName, hasAudio, hasVideo, participants } = useRoomStore();

  const allUsers = [
    {
      id: 'local',
      name: userName || 'You',
      hasAudio: hasAudio,
      hasVideo: hasVideo,
      isLocal: true,
    },
    ...Array.from(participants.entries()).map(([socketId, p]) => ({
      id: socketId,
      name: p.name,
      hasAudio: p.hasAudio,
      hasVideo: p.hasVideo,
      isLocal: false,
    }))
  ];
  
  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] text-white">
      <div className="p-4 border-b border-white/10">
        <h3 className="font-semibold text-white flex justify-between items-center">
          People 
          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{allUsers.length}</span>
        </h3>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {allUsers.map((user) => {
             // Random hue
             const hue = user.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
             
             return (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group">
                <div className="flex items-center space-x-3">
                    <div 
                        className="h-8 w-8 rounded-full flex items-center justify-center font-semibold text-sm shadow-sm"
                        style={{ background: `hsl(${hue}, 55%, 45%)` }}
                    >
                    {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                    <p className="text-sm font-medium text-white/90">
                        {user.name} {user.isLocal && <span className="text-white/50 text-xs ml-1">(You)</span>}
                    </p>
                    </div>
                </div>
                
                <div className="flex space-x-2.5 text-white/40">
                    {user.hasAudio ? <Mic size={16} /> : <MicOff size={16} className="text-red-400 group-hover:text-red-300 transition-colors" />}
                    {user.hasVideo ? <Video size={16} /> : <VideoOff size={16} className="text-red-400 group-hover:text-red-300 transition-colors" />}
                </div>
                </div>
             );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

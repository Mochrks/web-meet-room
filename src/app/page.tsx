'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, Keyboard } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');

  const handleCreateRoom = () => {
    // Generate a short 9 character room ID (like abc-def-ghi)
    const roomId = uuidv4().split('-')[0] + '-' + uuidv4().split('-')[1];
    router.push(`/room/${roomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      router.push(`/room/${joinCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
        
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              Premium Video Meetings. <br /> Now Free for Everyone.
            </h1>
            <p className="text-gray-400 text-lg md:text-xl font-light max-w-lg">
              Connect, collaborate, and celebrate from anywhere with Web Meet Online. Secure and high-quality video calling.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-800">
            <Button 
              onClick={handleCreateRoom}
              className="h-14 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-lg flex items-center shadow-lg shadow-indigo-600/20"
            >
              <Video className="mr-2" />
              New Meeting
            </Button>
            
            <form onSubmit={handleJoinRoom} className="flex relative flex-1">
              <div className="relative w-full flex items-center">
                <Keyboard className="absolute left-4 text-gray-400" size={20} />
                <Input 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter a code or link"
                  className="h-14 pl-12 pr-24 bg-gray-900 border-gray-800 focus-visible:ring-indigo-500 text-lg rounded-xl"
                />
                <Button 
                  type="submit" 
                  disabled={!joinCode.trim()}
                  variant="ghost" 
                  className="absolute right-2 text-indigo-400 hover:text-indigo-300 hover:bg-transparent font-semibold disabled:opacity-0"
                >
                  Join
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="hidden md:flex justify-center items-center animate-in fade-in slide-in-from-right-8 duration-1000">
          <div className="relative w-full aspect-square max-w-md">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-cyan-600/20 rounded-full blur-3xl" />
            <div className="relative bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col">
              <div className="flex-1 p-6 flex items-center justify-center">
                 <div className="grid grid-cols-2 gap-4 w-full">
                    {/* Simulated meeting UI */}
                    <div className="bg-gray-800 aspect-video rounded-xl" />
                    <div className="bg-gray-800 aspect-video rounded-xl" />
                    <div className="bg-gray-800 aspect-video rounded-xl" />
                    <div className="bg-gray-800 aspect-video rounded-xl flex items-center justify-center">
                      <div className="w-12 h-12 bg-indigo-600 rounded-full animate-pulse" />
                    </div>
                 </div>
              </div>
              <div className="h-16 bg-black border-t border-gray-800 flex items-center justify-center gap-4">
                 <div className="w-10 h-10 bg-gray-800 rounded-full" />
                 <div className="w-10 h-10 bg-gray-800 rounded-full" />
                 <div className="w-12 h-10 bg-red-600/80 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRoomStore } from '@/store/useRoomStore';
import { getSocket } from '@/shared/socket';

export function ChatPanel() {
  const { messages, userName } = useRoomStore();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderSocketId: getSocket().id || '',
      senderName: userName,
      text: text.trim(),
      timestamp: Date.now(),
      type: 'user' as const,
    };

    getSocket().emit('chat-message', message);
    setText('');
    
    // Optimistic update would normally go here, but our server broadcasts to room including sender
    // if we want to avoid duplicate we'd broadcast to socket.to() instead of io.to() and add it locally here.
    // Given the current server setup io.to(currentRoom).emit("chat-message", msg); it will echo back to sender.
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] text-white">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-semibold text-white">Chat</h3>
      </div>
      
      <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => {
            if (msg.type === 'system') {
                return (
                    <div key={msg.id} className="text-center">
                        <span className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded-full">{msg.text}</span>
                    </div>
                )
            }
            
            const isLocal = msg.senderSocketId === getSocket().id;
            
            return (
              <div key={msg.id} className={`flex flex-col ${isLocal ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-white/60 mb-1">{isLocal ? 'You' : msg.senderName}</span>
                <div 
                  className={`px-3 py-2 rounded-2xl max-w-[85%] ${
                    isLocal 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-white/10 text-white rounded-bl-none'
                  }`}
                >
                  <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                </div>
                <span className="text-[10px] text-white/40 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          {messages.length === 0 && (
              <div className="text-center text-white/40 text-sm mt-10">
                  No messages yet.<br/>Start the conversation!
              </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-white/10">
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="bg-white/5 border-white/10 text-white focus-visible:ring-indigo-500 rounded-full h-10 px-4"
          />
          <Button type="submit" size="icon" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-10 w-10 flex-shrink-0" disabled={!text.trim()}>
            <Send size={16} className="-ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

import { RoomClient } from './RoomClient';

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="h-screen w-full bg-black flex flex-col overflow-hidden text-white">
      <RoomClient roomId={id} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");

  const createGameCode = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8);
    router.push(`/room/${newRoomId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold">LoL 밴픽 사이트</h1>
      <input
        type="text"
        placeholder="방 코드 입력"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        className="border p-2 m-2"
      />
      <button
        onClick={() => router.push(`/draft?id=${roomId}`)}
        className="bg-blue-500 text-white p-2"
      >
        참가
      </button>
      <button
        onClick={createGameCode}
        className="bg-green-500 text-white p-2 mt-2"
      >
        방 만들기
      </button>
    </div>
  );
}

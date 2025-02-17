"use client";
import { useEffect } from "react";
import socket from "@/lib/socket";
import { useBanPickStore } from "@/store/banPickStore";
import { useSearchParams } from "next/navigation";

export default function Room() {
  const searchParams = useSearchParams();
  const id = searchParams?.get("id");

  const { bans, picks, setBans, setPicks } = useBanPickStore();

  // useEffect(() => {
  //   if (!id) return;

  //   socket.emit("join_room", id);

  //   socket.on("update_picks", (data) => {
  //     setBans(data.bans);
  //     setPicks(data.picks);
  //   });

  //   return () => {
  //     socket.off("update_picks");
  //   };
  // }, [id, setBans, setPicks]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">방 ID: {id}</h2>
      <div className="mt-4">
        <h3 className="font-semibold">밴 목록</h3>
        <ul>
          {bans.map((champ, idx) => (
            <li key={idx}>{champ}</li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold">픽 목록</h3>
        <ul>
          {picks.map((champ, idx) => (
            <li key={idx}>{champ}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBanPickStore } from "@/store/banPickStore";
import { RIOT_BASE_URL } from "@/constants/riot";
import type { ChampionData } from "@/types/champion";
import { Suspense } from "react";
import dynamic from "next/dynamic";

interface RoomSettings {
  version: string;
  draftMode: string;
  matchFormat: string;
  playerCount: string;
  timeLimit: string;
}

export default function FearlessBanpick() {
  const searchParams = useSearchParams();
  const gameCode = searchParams?.get("gameCode");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<RoomSettings | null>(null);
  const { bans, picks, setBans, setPicks } = useBanPickStore();
  const [champions, setChampions] = useState<ChampionData | null>(null);
  const [sortedChampions, setSortedChampions] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!gameCode) {
        setError("Game code is missing");
        setIsLoading(false);
        return;
      }

      try {
        const roomResponse = await fetch(
          `http://localhost:8000/game/${gameCode}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!roomResponse.ok) {
          throw new Error(`HTTP error! status: ${roomResponse.status}`);
        }

        const roomData = await roomResponse.json();
        if (!roomData || !roomData.settings) {
          throw new Error("Invalid room data received");
        }

        setSettings(roomData.settings);

        // Then fetch champions with the received version
        const championUrl = `${RIOT_BASE_URL}/cdn/${roomData.settings.version}/data/ko_KR/champion.json`;
        console.log("Fetching champions from:", championUrl);

        const championsResponse = await fetch(championUrl);
        if (!championsResponse.ok) throw new Error("Failed to fetch champions");

        const championsData = await championsResponse.json();
        setBans(roomData.bans);
        setPicks(roomData.picks);
        setChampions(championsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setError(
          error instanceof Error
            ? `서버 연결 실패 (${error.message}). 서버가 실행 중인지 확인해주세요.`
            : "Unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [gameCode, setBans, setPicks]); // Removed settings?.version dependency

  useEffect(() => {
    if (champions?.data) {
      const sorted = Object.values(champions.data).sort((a, b) =>
        a.name.localeCompare(b.name, "ko-KR")
      );
      setSortedChampions(sorted);
    }
  }, [champions]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-xl">Loading game data...</div>
        <div className="text-sm text-gray-500 mt-2">Room ID: {gameCode}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-500 text-xl">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="container mx-auto p-4 flex flex-col items-center">
        <h2 className="text-xl font-bold">방 ID: {gameCode}</h2>
        {settings && (
          <div className="mt-4 space-y-2">
            <p>패치 버전: {settings.version}</p>
            <p>게임 모드: {settings.draftMode}</p>
            <p>대회 형식: {settings.matchFormat}</p>
            <p>참여 인원: {settings.playerCount}</p>
            <p>시간 제한: {settings.timeLimit}</p>
          </div>
        )}

        {champions && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">챔피언 목록</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {sortedChampions.map((champion) => (
                <div
                  key={champion.id}
                  className="group relative flex flex-col items-center border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  {/* White overlay on hover */}
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-50 transition-opacity duration-300" />

                  {/* Champion content */}
                  <div className="relative z-10 p-3 w-full flex flex-col items-center">
                    <img
                      src={`${RIOT_BASE_URL}/cdn/${settings?.version}/img/champion/${champion.id}.png`}
                      alt={champion.name}
                      className="w-16 h-16 object-cover"
                      loading="lazy"
                    />
                    <span className="mt-2 text-sm font-medium">
                      {champion.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

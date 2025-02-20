"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBanPickStore } from "@/store/banPickStore";
import { RIOT_BASE_URL } from "@/constants/riot";
import type { ChampionData } from "@/types/champion";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { DRAFT_SEQUENCE, canInteract } from "@/utils/draftUtils";
import type { DraftStep, PlayerInfo, TeamType } from "@/types/draft";
import {
  TOURNAMENT_SEQUENCE,
  getCurrentStep,
  getTeamBans,
  getTeamPicks,
} from "@/utils/draftUtils";

interface RoomSettings {
  version: string;
  draftMode: string;
  matchFormat: string;
  playerCount: string;
  timeLimit: string;
}

export default function TournamentBanpick() {
  const searchParams = useSearchParams();
  const gameCode = searchParams?.get("gameCode");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<RoomSettings | null>(null);
  const { bans = [], picks = [], setBans, setPicks } = useBanPickStore();
  const [champions, setChampions] = useState<ChampionData | null>(null);
  const [sortedChampions, setSortedChampions] = useState<any[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);

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
        setBans(roomData.bans || []);
        setPicks(roomData.picks || []);
        setChampions(championsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setBans([]); // Initialize with empty array on error
        setPicks([]); // Initialize with empty array on error
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

  useEffect(() => {
    // Set initial player info based on the game settings
    if (settings) {
      setPlayerInfo({
        team: "BLUE", // Default to BLUE team
        position: 1, // Default to position 1
      });
    }
  }, [settings]);

  const handleChampionSelect = (championId: string) => {
    if (!settings || currentStepIndex >= TOURNAMENT_SEQUENCE.length) return;

    const currentStep = getCurrentStep(currentStepIndex);
    if (!currentStep) return;

    if (currentStep.phase === "BAN") {
      const newBans = [...(bans || [])];
      newBans[currentStep.index] = championId;
      setBans(newBans);
    } else {
      const newPicks = [...(picks || [])];
      newPicks[currentStep.index] = championId;
      setPicks(newPicks);
    }

    setCurrentStepIndex((prev) => prev + 1);
  };

  const renderTeamSide = (team: TeamType) => {
    const teamBans = getTeamBans(team, bans || []);
    const teamPicks = getTeamPicks(team, picks || []);

    return (
      <div className={`bg-${team.toLowerCase()}-50 p-4 rounded-lg`}>
        <h3 className={`text-xl font-bold text-${team.toLowerCase()}-800 mb-4`}>
          {team === "BLUE" ? "블루팀" : "레드팀"}
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">BANS</h4>
            <div className="grid grid-cols-5 gap-2">
              {teamBans.map((championId, index) => (
                <div
                  key={`${team.toLowerCase()}-ban-${index}`}
                  className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center"
                >
                  {championId && settings?.version && (
                    <img
                      src={`${RIOT_BASE_URL}/cdn/${settings.version}/img/champion/${championId}.png`}
                      alt={championId}
                      className="w-full h-full object-cover rounded-lg opacity-50"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">PICKS</h4>
            <div className="space-y-2">
              {teamPicks.map((championId, index) => (
                <div
                  key={`${team.toLowerCase()}-pick-${index}`}
                  className="h-16 bg-gray-200 rounded-lg flex items-center p-2"
                >
                  {championId && settings?.version && (
                    <img
                      src={`${RIOT_BASE_URL}/cdn/${settings.version}/img/champion/${championId}.png`}
                      alt={championId}
                      className="h-full aspect-square object-cover rounded-lg mr-2"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

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
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-[300px_1fr_300px] gap-4">
          {renderTeamSide("BLUE")}

          {/* 중앙 챔피언 선택 영역 */}
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4">방 ID: {gameCode}</h2>
            {settings && getCurrentStep(currentStepIndex) && (
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold">
                  {getCurrentStep(currentStepIndex)?.team} Team's Turn (
                  {getCurrentStep(currentStepIndex)?.phase})
                </h3>
              </div>
            )}

            {/* 챔피언 그리드 */}
            {champions && (
              <div className="w-full">
                <div className="grid grid-cols-6 gap-2">
                  {sortedChampions.map((champion) => {
                    const isBanned =
                      Array.isArray(bans) && bans.includes(champion.id);
                    const isPicked =
                      Array.isArray(picks) && picks.includes(champion.id);

                    return (
                      <div
                        key={champion.id}
                        onClick={() =>
                          !isBanned &&
                          !isPicked &&
                          handleChampionSelect(champion.id)
                        }
                        className={`
                          group relative aspect-square flex flex-col items-center border rounded-lg overflow-hidden
                          ${
                            isBanned
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer hover:shadow-lg"
                          }
                          ${isPicked ? "opacity-50 cursor-not-allowed" : ""}
                          transition-all duration-300
                        `}
                      >
                        <img
                          src={`${RIOT_BASE_URL}/cdn/${settings?.version}/img/champion/${champion.id}.png`}
                          alt={champion.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute bottom-0 w-full bg-black bg-opacity-50 p-1">
                          <span className="text-white text-xs">
                            {champion.name}
                          </span>
                        </div>
                        {(isBanned || isPicked) && (
                          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                            <span className="text-white font-bold">
                              {isBanned ? "BANNED" : "PICKED"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {renderTeamSide("RED")}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const RIOT_BASE_URL = "https://ddragon.leagueoflegends.com";

export default function Page() {
  const router = useRouter();
  const [versions, setVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [roomId, setRoomId] = useState("");
  const [draftMode, setDraftMode] = useState("fearless");
  const [matchFormat, setMatchFormat] = useState("bo5");
  const [playerCount, setPlayerCount] = useState("solo");
  const [timeLimit, setTimeLimit] = useState("tournament");
  const [teamImage, setTeamImage] = useState<File | null>(null);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await fetch(`${RIOT_BASE_URL}/api/versions.json`);
        const data = await response.json();
        setVersions(data);
        setSelectedVersion(data[0]); // Set latest version as default
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch versions:", error);
        setIsLoading(false);
      }
    };

    fetchVersions();
  }, []);

  const createGameCode = async () => {
    try {
      const settings = {
        version: selectedVersion,
        draftMode: draftMode,
        matchFormat: matchFormat,
        playerCount: playerCount,
        timeLimit: timeLimit,
      };

      const response = await fetch("http://localhost:8000/create-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to create room");
      }

      const data = await response.json();
      console.log(data);
      const gameCode = data.room_id;

      router.push(`/draft?gameCode=${gameCode}`);
    } catch (error) {
      console.error("Failed to create room:", error);
      alert("방 생성에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-8">LoL 밴픽 사이트</h1>

      <div className="w-64 space-y-6">
        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2">패치 버전</legend>
          <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="w-full p-2 border rounded"
            disabled={isLoading}
          >
            {isLoading ? (
              <option>로딩중...</option>
            ) : (
              versions.slice(0, 3).map((version) => (
                <option key={version} value={version}>
                  {version}
                </option>
              ))
            )}
          </select>
        </fieldset>

        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2">밴픽 모드</legend>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="fearless"
                checked={draftMode === "fearless"}
                onChange={(e) => setDraftMode(e.target.value)}
                className="mr-2"
              />
              피어리스 드래프트
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="tournament"
                checked={draftMode === "tournament"}
                onChange={(e) => setDraftMode(e.target.value)}
                className="mr-2"
              />
              토너먼트 드래프트
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="solorank"
                checked={draftMode === "solorank"}
                onChange={(e) => setDraftMode(e.target.value)}
                className="mr-2"
              />
              솔로랭크
            </label>
          </div>
        </fieldset>

        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2">대회 세트 수</legend>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="bo5"
                checked={matchFormat === "bo5"}
                onChange={(e) => setMatchFormat(e.target.value)}
                className="mr-2"
              />
              5판 3선승
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="bo3"
                checked={matchFormat === "bo3"}
                onChange={(e) => setMatchFormat(e.target.value)}
                className="mr-2"
              />
              3판 2선승
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="bo1"
                checked={matchFormat === "bo1"}
                onChange={(e) => setMatchFormat(e.target.value)}
                className="mr-2"
              />
              단판제
            </label>
          </div>
        </fieldset>

        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2">밴픽 참여자 수</legend>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="solo"
                checked={playerCount === "solo"}
                onChange={(e) => setPlayerCount(e.target.value)}
                className="mr-2"
              />
              1인 진행
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="representative"
                checked={playerCount === "representative"}
                onChange={(e) => setPlayerCount(e.target.value)}
                className="mr-2"
              />
              팀 대표 1vs1
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="team"
                checked={playerCount === "team"}
                onChange={(e) => setPlayerCount(e.target.value)}
                className="mr-2"
              />
              팀 전원 5vs5
            </label>
          </div>
        </fieldset>

        <fieldset className="border p-4 rounded">
          <legend className="font-semibold px-2">밴픽 시간</legend>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="tournament"
                checked={timeLimit === "tournament"}
                onChange={(e) => setTimeLimit(e.target.value)}
                className="mr-2"
              />
              대회와 동일하게
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="unlimited"
                checked={timeLimit === "unlimited"}
                onChange={(e) => setTimeLimit(e.target.value)}
                className="mr-2"
              />
              시간 무제한
            </label>
          </div>
        </fieldset>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setTeamImage(e.target.files?.[0] || null)}
          className="w-full"
        />

        <div className="space-y-2 mt-8">
          <button
            onClick={() => createGameCode()}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            방 만들기
          </button>
        </div>
      </div>
    </div>
  );
}

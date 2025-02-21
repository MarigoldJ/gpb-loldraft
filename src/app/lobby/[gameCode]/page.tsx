"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLobbyStore } from "@/store/lobbyStore";
import NicknameModal from "@/components/lobby/NicknameModal";
import type { LobbyUser } from "@/types/lobby";
import { useLobbyWebSocket } from "@/hooks/useLobbyWebSocket";

interface PageParams {
  gameCode: string;
  [key: string]: string | string[];
}

export default function LobbyPage() {
  const params = useParams<PageParams>();
  const router = useRouter();
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const { users, setUsers, updateUser } = useLobbyStore();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<LobbyUser | null>(null);

  const { sendMessage, isConnected, connectionStatus } = useLobbyWebSocket({
    gameCode: params?.gameCode || "",
    onStatusUpdate: (data) => {
      console.log("Status update received:", data);
      if (data.users) {
        setUsers(data.users);
        if (currentUser) {
          const updatedCurrentUser = data.users.find(
            (user: LobbyUser) => user.id === currentUser.id
          );
          if (updatedCurrentUser) {
            setCurrentUser(updatedCurrentUser);
          }
        }
      }

      if (data.status === "in_progress" && params?.gameCode) {
        router.push(
          `/draft/${data.settings.draftMode}?gameCode=${params.gameCode}`
        );
      }
    },
    onError: (error) => {
      console.error("WebSocket error:", error);
      // 사용자에게 연결 오류 알림
      if (connectionStatus === "disconnected") {
        alert("서버와의 연결이 끊겼습니다. 페이지를 새로고침해주세요.");
      }
    },
  });

  // 초기 로비 데이터 로딩 (한 번만 실행)
  useEffect(() => {
    const fetchLobbyData = async () => {
      if (!params?.gameCode) {
        router.push("/");
        return;
      }
      try {
        const response = await fetch(
          `http://localhost:8000/game/${params.gameCode}/status`
        );
        const data = await response.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error("Failed to fetch lobby data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLobbyData();
  }, [params?.gameCode]);

  const handleNicknameSubmit = async (nickname: string) => {
    if (!params?.gameCode) {
      console.error("Game code not found");
      return;
    }
    try {
      const response = await fetch(
        `http://localhost:8000/game/${params.gameCode}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname }),
        }
      );

      const data = await response.json();
      console.log("Server response:", data);

      const userId = data.userId || data.user?.id || data.id;

      if (!userId) {
        console.error("User ID not found in response:", data);
        throw new Error("Invalid server response: no user ID found");
      }

      const newUser: LobbyUser = {
        id: userId,
        nickname,
        team: "SPECTATOR",
        position: -1,
        isReady: false,
        isHost: false,
      };

      setCurrentUser(newUser);
      setShowNicknameModal(false);
      // WebSocket을 통해 상태 업데이트를 받으므로 여기서 users를 직접 업데이트하지 않음
    } catch (error) {
      console.error("Join lobby error details:", error);
      alert("로비 참가에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleTeamJoin = async (
    team: "BLUE" | "RED" | "SPECTATOR",
    position: number
  ) => {
    if (!currentUser || !params?.gameCode) return;

    if (currentUser.isReady) {
      alert("준비 완료 상태에서는 팀을 변경할 수 없습니다.");
      return;
    }

    const success = sendMessage({
      action: "update_team",
      userId: currentUser.id,
      teamData: { team, position },
    });

    if (!success) {
      // Fallback to REST API
      try {
        const response = await fetch(
          `http://localhost:8000/game/${params.gameCode}/user/${currentUser.id}/team`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ team, position }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update team");
        }
      } catch (error) {
        console.error("Failed to join team:", error);
      }
    }
  };

  const handleReady = async () => {
    if (!currentUser || !params?.gameCode) return;

    const success = sendMessage({
      action: "update_ready",
      userId: currentUser.id,
      isReady: !currentUser.isReady,
    });

    if (!success) {
      try {
        const response = await fetch(
          `http://localhost:8000/game/${params.gameCode}/user/${currentUser.id}/ready`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isReady: !currentUser.isReady }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update ready status");
        }
      } catch (error) {
        console.error("Failed to update ready status:", error);
      }
    }
  };

  // 밴픽 시작 가능 여부 확인
  const canStartDraft = () => {
    const blueTeam = users.filter((user) => user.team === "BLUE");
    const redTeam = users.filter((user) => user.team === "RED");

    // 각 팀에 정확히 1명의 플레이어가 있는지 확인
    const hasCorrectTeamSize = blueTeam.length === 1 && redTeam.length === 1;
    // 모든 팀원이 준비 완료 상태인지 확인
    const allPlayersReady = [...blueTeam, ...redTeam].every(
      (user) => user.isReady
    );

    return hasCorrectTeamSize && allPlayersReady;
  };

  // 밴픽 시작 처리 수정
  const handleStartDraft = () => {
    if (!currentUser?.isHost) return;

    const success = sendMessage({
      action: "start_draft",
      userId: currentUser.id,
    });

    if (!success) {
      alert("밴픽 시작에 실패했습니다. 연결 상태를 확인해주세요.");
    }
  };

  const renderTeamSlots = (team: "BLUE" | "RED") => {
    const teamUsers = users.filter((user) => user.team === team);
    const maxSlots = 1;

    return Array(maxSlots)
      .fill(null)
      .map((_, index) => {
        const user = teamUsers[index];
        const isCurrentUserSlot = user?.id === currentUser?.id;

        return (
          <div
            key={`${team}-slot-${index}`}
            className={`h-12 bg-white rounded-lg shadow p-2 mb-2 flex items-center justify-between 
              ${
                (!user || isCurrentUserSlot) && !currentUser?.isReady
                  ? "cursor-pointer hover:bg-gray-100"
                  : ""
              }`}
            onClick={() => {
              if (user?.id === currentUser?.id) {
                // 자신의 슬롯을 클릭하면 관전자로 이동
                handleTeamJoin("SPECTATOR", -1);
              } else if (!user && !currentUser?.isReady) {
                // 빈 슬롯을 클릭하면 해당 팀으로 이동
                handleTeamJoin(team, index);
              }
            }}
          >
            {user ? (
              <>
                <span>{user.nickname}</span>
                <span className="text-sm text-gray-500">
                  {user.isReady ? "준비완료" : "대기중"}
                </span>
              </>
            ) : (
              <span className="text-gray-400">비어있음</span>
            )}
          </div>
        );
      });
  };

  const renderSpectatorSlots = () => {
    const spectators = users.filter((user) => user.team === "SPECTATOR");
    const maxSpectatorSlots = 20;

    return (
      <div className="grid grid-cols-4 gap-2">
        {Array(maxSpectatorSlots)
          .fill(null)
          .map((_, index) => {
            const user = spectators[index];
            const isCurrentUserSlot = user?.id === currentUser?.id;
            const canJoinSpectator = !currentUser?.isReady && !user;

            return (
              <div
                key={`spectator-slot-${index}`}
                className={`h-12 bg-white rounded-lg shadow p-2 flex items-center justify-between
                  ${isCurrentUserSlot ? "bg-gray-100" : ""}
                  ${canJoinSpectator ? "cursor-pointer hover:bg-gray-50" : ""}`}
                onClick={() => {
                  if (canJoinSpectator) {
                    handleTeamJoin("SPECTATOR", index);
                  }
                }}
              >
                {user ? (
                  <span className="text-black">{user.nickname}</span>
                ) : (
                  <span className="text-gray-400">비어있음</span>
                )}
              </div>
            );
          })}
      </div>
    );
  };

  // 버튼 영역 렌더링
  const renderButtons = () => {
    const isInTeam =
      currentUser?.team === "BLUE" || currentUser?.team === "RED";

    return (
      <div className="flex justify-center gap-4 mb-6">
        {/* 준비 완료/해제 버튼 */}
        {isInTeam && (
          <button
            onClick={handleReady}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors
              ${
                currentUser?.isReady
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-800"
              }`}
          >
            {currentUser?.isReady ? "준비 완료" : "준비하기"}
          </button>
        )}

        {/* 밴픽 시작 버튼 */}
        {currentUser?.isHost && (
          <button
            onClick={handleStartDraft}
            disabled={!canStartDraft()}
            className={`px-6 py-2 rounded-lg font-semibold text-white transition-colors
              ${
                canStartDraft()
                  ? "bg-blue-500 hover:bg-blue-600"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            title={
              !canStartDraft()
                ? "모든 플레이어가 준비 완료해야 시작할 수 있습니다."
                : ""
            }
          >
            밴픽 시작
          </button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen p-4">
      {showNicknameModal && <NicknameModal onSubmit={handleNicknameSubmit} />}

      <div className="flex flex-col">
        {renderButtons()}
        <div className="grid grid-cols-[1fr_2fr_1fr] gap-4">
          {/* Blue Team */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-xl font-bold text-blue-800 mb-4">블루팀</h2>
            {renderTeamSlots("BLUE")}
          </div>

          {/* Center Area */}
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">
              Lobby #{params?.gameCode || ""}
            </h1>
          </div>

          {/* Red Team */}
          <div className="bg-red-50 p-4 rounded-lg">
            <h2 className="text-xl font-bold text-red-800 mb-4">레드팀</h2>
            {renderTeamSlots("RED")}
          </div>

          {/* Spectators */}
          <div className="col-span-3 bg-gray-50 p-4 rounded-lg mt-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">관전자</h2>
            {renderSpectatorSlots()}
          </div>
        </div>
      </div>
    </div>
  );
}

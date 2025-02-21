import { useState } from "react";

interface NicknameModalProps {
  onSubmit: (nickname: string) => void;
}

export default function NicknameModal({ onSubmit }: NicknameModalProps) {
  const [nickname, setNickname] = useState("");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-xl font-bold mb-4">닉네임 설정</h2>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임을 입력하세요"
          className="w-full p-2 border rounded mb-4 text-black"
        />
        <button
          onClick={() => onSubmit(nickname)}
          disabled={!nickname}
          className="w-full bg-blue-500 text-white p-2 rounded disabled:bg-gray-300"
        >
          확인
        </button>
      </div>
    </div>
  );
}

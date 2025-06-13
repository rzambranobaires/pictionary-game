import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const navigate = useNavigate();

  const handleStartGame = () => {
    const roomId = uuidv4();
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 w-screen">
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold">Draw & Guess</h1>
        <button
          onClick={handleStartGame}
          className="bg-blue-600 text-white px-6 py-3 text-lg font-semibold rounded shadow hover:bg-blue-700"
        >
          Start New Game
        </button>
      </div>
    </div>
  );
}

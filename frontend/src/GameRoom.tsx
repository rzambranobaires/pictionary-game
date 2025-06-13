import { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

// Get or create a session ID for the player
const getOrCreateSessionId = () => {
  let session_id = localStorage.getItem("session_id");
  if (!session_id) {
    session_id = uuidv4();
    localStorage.setItem("session_id", session_id);
  }
  return session_id;
};

export default function GameRoom() {
  const { roomId } = useParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const session_id = getOrCreateSessionId();

  const [isDrawing, setIsDrawing] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"drawer" | "guesser">("guesser");
  const [connected, setConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isDrawer, setIsDrawer] = useState(false);
  const [wordToDraw, setWordToDraw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winnerName, setWinnerName] = useState("");

  const connectWebSocket = () => {
    const wsUrl = `${import.meta.env.VITE_WS_URL}/${roomId}`;
    console.log("Connecting to WebSocket:", wsUrl);
    socketRef.current = new WebSocket(wsUrl);

    const socket = socketRef.current;
    socket.onopen = () => {
      console.log("✅ Connected to WebSocket");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "draw": {
          const ctx = canvasRef.current?.getContext("2d");
          if (ctx) {
            ctx.lineTo(data.x, data.y);
            ctx.stroke();
          }
          break;
        }
        case "chat":
          setChatMessages((prev) => [...prev, data.message]);
          break;
        case "role":
          setIsDrawer(data.is_drawer);
          if (data.is_drawer) setWordToDraw(data.word);
          break;
        case "win":
          setWinnerName(data.name);
          setShowWinModal(true);
          break;
        case "reset": {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          onResetGame();
          break;
        }
        case "error":
          setError(data.message);
          setConnected(false);
          break;
        default:
          console.warn("Unhandled message:", data);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      socket.close();
    };

    socket.onclose = () => {
      console.warn("WebSocket closed. Reconnecting in 2s...");
      setTimeout(connectWebSocket, 2000);
    };
  };

  useEffect(() => {
    connectWebSocket();

    const storedName = localStorage.getItem(`name-${roomId}`);
    if (storedName) setName(storedName);

    return () => {
      socketRef.current?.close();
    };
  }, [roomId]);

  const onResetGame = () => {
    setChatMessages([]);
    setWinnerName("");
    setShowWinModal(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDrawer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawer || !isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !ctx || !rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    socketRef.current?.send(JSON.stringify({ type: "draw", x, y }));
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleJoin = () => {
    socketRef.current?.send(
      JSON.stringify({ type: "join", name, role, session_id })
    );
    setConnected(true);
    localStorage.setItem(`name-${roomId}`, name);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    socketRef.current?.send(
      JSON.stringify({ type: "chat", message: `${name}: ${inputMessage}` })
    );
    if (!isDrawer) {
      socketRef.current?.send(
        JSON.stringify({ type: "guess", name, guess: inputMessage })
      );
    }
    setInputMessage("");
  };

  const handleCloseModal = () => {
    socketRef.current?.send(JSON.stringify({ type: "new_round" }));
    setShowWinModal(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4 w-screen">
      {!connected ? (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm text-center space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Join Pictionary
            </h2>
            <input
              className="w-full border border-gray-300 p-2 rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
            <div className="flex justify-center space-x-6">
              <label className="flex items-center space-x-2 text-gray-700">
                <input
                  type="radio"
                  value="drawer"
                  checked={role === "drawer"}
                  onChange={() => setRole("drawer")}
                />
                <span>Drawer</span>
              </label>
              <label className="flex items-center space-x-2 text-gray-700">
                <input
                  type="radio"
                  value="guesser"
                  checked={role === "guesser"}
                  onChange={() => setRole("guesser")}
                />
                <span>Guesser</span>
              </label>
            </div>
            <button
              onClick={handleJoin}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded transition"
            >
              Join Game
            </button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-2">Pictionary Game 🎨</h1>
          {isDrawer && (
            <div className="mb-2 text-green-600">
              You're the drawer! Draw: <strong>{wordToDraw}</strong>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="border bg-white"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          {!isDrawer && (
            <form onSubmit={handleChatSubmit} className="mt-4">
              <input
                className="border p-2 rounded w-96"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your guess or message"
              />
              <button
                className="ml-2 bg-blue-600 text-white px-4 py-2 rounded"
                type="submit"
              >
                Send
              </button>
            </form>
          )}
          <div className="mt-4 bg-white p-4 w-96 h-40 overflow-y-scroll border rounded">
            {chatMessages.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>
          {showWinModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                <h2 className="text-2xl font-extrabold text-gray-800 mb-4">
                  🎉 <span className="text-blue-600">{winnerName}</span>
                  <br /> guessed the word!
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-6 py-2 rounded-lg transition duration-200"
                >
                  Start New Round
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

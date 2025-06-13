import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import GameRoom from "./GameRoom";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<GameRoom />} />
      </Routes>
    </Router>
  );
}

export default App;

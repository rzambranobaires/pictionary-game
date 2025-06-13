# 🎨 Pictionary Web App

A real-time multiplayer Pictionary game built with:

- ⚡️ FastAPI backend (WebSocket-powered)
- ⚛️ React + TailwindCSS frontend
- 📡 Real-time drawing and guessing
- 👥 Player role management (drawer vs guesser)
- 🔁 Automatic round rotation

---

## 🚀 Getting Started

### Prerequisites

- Node.js (≥ 18.x)
- Python 3.8+
- Yarn or npm
- [Optional but recommended] Virtualenv or pyenv

---

### 🔧 Setup Instructions

#### 1. Clone the Repo

```
git clone https://github.com/your-username/pictionary-app.git
cd pictionary-app
```
### 2. Setup Backend (FastAPI)
```bash
Copy
Edit
cd backend
python3 -m venv venv
source venv/bin/activate
```

# Install backend dependencies
pip install -r requirements.txt

# Start the FastAPI WebSocket server
uvicorn main:app --reload
Backend will run on: http://localhost:8000

### 3. Setup Frontend (React + Tailwind)
```bash
Copy
Edit
cd ../frontend
```

# Install frontend dependencies
yarn install  # or npm install

# Start the dev server
yarn dev

Frontend will run on: http://localhost:5173

## 🕹️ How to Play
Open the app in 2+ browser tabs or devices.

### Each player:

Enters their name

Chooses a role: Drawer or Guesser

Clicks Join Game

The drawer receives a secret word and draws it on the canvas.

Guessers try to guess the word by typing in the input box.

When someone guesses the word correctly:

🎉 Everyone sees a win modal

🌀 A new round starts with a new drawer and word

🧩 Features
Real-time collaborative canvas

Guess verification + winner notification

Round rotation (drawer rotates to next player)

Modal UI for round transitions

Role-based input visibility

### 🔐 Environment Variables
Create a .env file if needed:
```
frontend/.env

env
Copy
Edit
VITE_WS_URL=http://localhost:8000/ws
No secrets needed for local development.
``` 

## 💡 Future Improvements
 - Scoreboard and player stats
 - Timed rounds
 - Word difficulty settings
 - Authenticated multiplayer lobby

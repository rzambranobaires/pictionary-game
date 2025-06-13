from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict
import random
import uuid

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global game data
ROOMS: dict[str, dict] = defaultdict(lambda: {
    "clients": {},  # session_id -> WebSocket
    "names": {},    # session_id -> name
    "roles": {},    # session_id -> role
    "drawer_id": None,
    "current_word": None
})

WORDS = ["apple", "house", "car", "tree", "pizza"]

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()

    session_id = str(uuid.uuid4())  # fallback session_id
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "join":
                session_id = data["session_id"]
                name = data["name"]
                role = data["role"]
                room = ROOMS[room_id]

                # Save client data
                room["clients"][session_id] = websocket
                room["names"][session_id] = name
                room["roles"][session_id] = role

                if role == "drawer":
                    if room["drawer_id"] is None:
                        room["drawer_id"] = session_id
                        room["current_word"] = random.choice(WORDS)
                        await websocket.send_json({
                            "type": "role",
                            "is_drawer": True,
                            "word": room["current_word"]
                        })
                    else:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Drawer already assigned. Join as guesser."
                        })
                else:
                    await websocket.send_json({"type": "role", "is_drawer": False})

            elif msg_type == "draw":
                for sid, client in ROOMS[room_id]["clients"].items():
                    if client != websocket:
                        await client.send_json({
                            "type": "draw",
                            "x": data["x"],
                            "y": data["y"]
                        })

            elif msg_type == "chat":
                for client in ROOMS[room_id]["clients"].values():
                    await client.send_json({
                        "type": "chat",
                        "message": data["message"]
                    })

            elif msg_type == "guess":
                guess = data.get("guess", "").strip().lower()
                room = ROOMS[room_id]
                if room["current_word"] and guess == room["current_word"]:
                    winner_name = data["name"]
                    for client in room["clients"].values():
                        await client.send_json({"type": "win", "name": winner_name})

                    # Rotate drawer
                    all_ids = list(room["clients"].keys())
                    if room["drawer_id"] in all_ids:
                        current_index = all_ids.index(room["drawer_id"])
                        next_index = (current_index + 1) % len(all_ids)
                        room["drawer_id"] = all_ids[next_index]
                        room["current_word"] = random.choice(WORDS)

                        for sid, client in room["clients"].items():
                            is_drawer = sid == room["drawer_id"]
                            await client.send_json({
                                "type": "role",
                                "is_drawer": is_drawer,
                                "word": room["current_word"] if is_drawer else None
                            })

            elif msg_type == "new_round":
                room = ROOMS[room_id]
                all_ids = list(room["clients"].keys())
                if room["drawer_id"] in all_ids:
                    current_index = all_ids.index(room["drawer_id"])
                    next_index = (current_index + 1) % len(all_ids)
                    room["drawer_id"] = all_ids[next_index]
                    room["current_word"] = random.choice(WORDS)

                    # 🔄 Notify reset first so clients prepare for new round
                    for client in room["clients"].values():
                        await client.send_json({"type": "reset"})

                    # 🎭 Then update roles and notify each client
                    for sid, client in room["clients"].items():
                        is_drawer = sid == room["drawer_id"]
                        room["roles"][sid] = "drawer" if is_drawer else "guesser"
                        await client.send_json({
                            "type": "role",
                            "is_drawer": is_drawer,
                            "word": room["current_word"] if is_drawer else None
                        })


                    # Notify all to clear canvas and chat
                    for client in room["clients"].values():
                        await client.send_json({"type": "reset"})

    except WebSocketDisconnect:
        room = ROOMS[room_id]
        if session_id in room["clients"]:
            del room["clients"][session_id]
            del room["names"][session_id]
            del room["roles"][session_id]
            if room["drawer_id"] == session_id:
                room["drawer_id"] = None
                room["current_word"] = None

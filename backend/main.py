from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from collections import deque
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = deque()
player_names = {}
drawer_id = None
current_word = None
WORDS = ["apple", "house", "car", "tree", "pizza"]

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global drawer_id, current_word

    await websocket.accept()
    clients.append(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "join":
                role = data.get("role")
                player_names[websocket] = data["name"]

                if role == "drawer":
                    if drawer_id is None:
                        drawer_id = websocket
                        current_word = random.choice(WORDS)
                        await websocket.send_json({
                            "type": "role",
                            "is_drawer": True,
                            "word": current_word
                        })
                    else:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Drawer already assigned. Please join as a guesser."
                        })
                        continue
                else:
                    await websocket.send_json({
                        "type": "role",
                        "is_drawer": False
                    })

            elif msg_type == "draw":
                for client in clients:
                    if client != websocket:
                        await client.send_json({
                            "type": "draw",
                            "x": data["x"],
                            "y": data["y"]
                        })

            elif msg_type == "chat":
                for client in clients:
                    await client.send_json({
                        "type": "chat",
                        "message": data["message"]
                    })

            elif msg_type == "guess":
                guess = data.get("guess", "").strip().lower()
                if current_word and guess == current_word:
                    # Notify all users of the winner
                    for client in clients:
                        await client.send_json({
                            "type": "win",
                            "name": data["name"]
                        })

                    # Rotate the drawer role
                    if clients:
                        clients.rotate(-1)
                        drawer_id = clients[0]
                        current_word = random.choice(WORDS)

                        for client in clients:
                            if client == drawer_id:
                                await client.send_json({
                                    "type": "role",
                                    "is_drawer": True,
                                    "word": current_word
                                })
                            else:
                                await client.send_json({
                                    "type": "role",
                                    "is_drawer": False
                                })
            elif msg_type == "new_round":
                if clients:
                    clients.rotate(-1)
                    drawer_id = clients[0]
                    current_word = random.choice(WORDS)

                    for client in clients:
                        if client == drawer_id:
                            await client.send_json({
                                "type": "role",
                                "is_drawer": True,
                                "word": current_word
                            })
                        else:
                            await client.send_json({
                                "type": "role",
                                "is_drawer": False
                            })

                    # Notify all to clear canvas and chat
                    for client in clients:
                        await client.send_json({
                            "type": "reset"
                        })
    except WebSocketDisconnect:
        clients.remove(websocket)
        if websocket in player_names:
            del player_names[websocket]
        if websocket == drawer_id:
            drawer_id = None
            current_word = None

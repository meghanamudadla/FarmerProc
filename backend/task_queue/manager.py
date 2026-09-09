from fastapi import WebSocket


class ConnectionManager:

    def __init__(self):
        self.active_connections = {}

    async def connect(
        self,
        websocket: WebSocket,
        center_id: int
    ):
        await websocket.accept()

        if center_id not in self.active_connections:
            self.active_connections[center_id] = []

        self.active_connections[center_id].append(websocket)

    def disconnect(
        self,
        websocket: WebSocket,
        center_id: int
    ):
        if center_id in self.active_connections:

            if websocket in self.active_connections[center_id]:
                self.active_connections[center_id].remove(websocket)

            if not self.active_connections[center_id]:
                del self.active_connections[center_id]

    async def broadcast(
        self,
        center_id: int,
        message: dict
    ):

        connections = self.active_connections.get(
            center_id,
            []
        )

        disconnected = []

        for websocket in connections:

            try:
                await websocket.send_json(message)

            except Exception:
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(
                websocket,
                center_id
            )


manager = ConnectionManager()
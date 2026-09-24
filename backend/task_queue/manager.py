from fastapi import WebSocket
import uuid
from datetime import datetime


class ConnectionManager:

    def __init__(self):
        # Maps center_id -> list of active WebSocket objects
        self.active_connections = {}
        self.event_sequence = 0

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

        # Attach standard event ID and ISO timestamp for synchronization
        self.event_sequence += 1
        enriched_message = {
            "event_id": f"EVT-{self.event_sequence}-{uuid.uuid4().hex[:6]}",
            "timestamp": datetime.utcnow().isoformat(),
            **message
        }

        disconnected = []

        for websocket in connections:
            try:
                await websocket.send_json(enriched_message)
            except Exception:
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(
                websocket,
                center_id
            )


manager = ConnectionManager()
import asyncio
import websockets


async def manual_ws_listener():

    url = "ws://127.0.0.1:8000/queue/ws/2"

    async with websockets.connect(url) as websocket:

        print("WebSocket connected!")

        while True:

            message = await websocket.recv()

            print("Message received:")
            print(message)


if __name__ == "__main__":
    asyncio.run(manual_ws_listener())
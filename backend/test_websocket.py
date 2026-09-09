import asyncio
import websockets


async def test():

    url = "ws://127.0.0.1:8000/queue/ws/2"

    async with websockets.connect(url) as websocket:

        print("WebSocket connected!")

        while True:

            message = await websocket.recv()

            print("Message received:")
            print(message)


asyncio.run(test())
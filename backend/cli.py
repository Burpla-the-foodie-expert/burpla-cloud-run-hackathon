import asyncio
import uuid
from agent_gadk.orchestrator import run_conversation
from db_services.chat import ChatManager

async def main():
    user_id = "user_001"
    session_id = str(uuid.uuid4())
    session_id = "session_001"
    chat_manager = ChatManager()
    print("🍔 Welcome to the Burpla CLI! Type your messages below (type 'exit' or 'quit' to leave):\n")
    while True:
        user_input = input("You: ").strip()

        if not user_input:
            continue

        chat_manager.save_chat_message(
            session_id=session_id,
            user_id=user_id,
            message_id=str(uuid.uuid4()),
            content=user_input
        )

        response = await run_conversation(
            query=user_input,
            app_name="burpla",
            user_id=user_id,
            session_id=session_id
        )

        chat_manager.save_chat_message(
            session_id=session_id,
            user_id='bot',
            message_id=str(uuid.uuid4()),
            content=response
        )

        print(f"\n🍔 Burpla: {response}\n")
        if user_input.lower() in {"exit", "quit"}:
            break

if __name__ == "__main__":
    asyncio.run(main())

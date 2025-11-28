import logging
import json
from rich.console import Console
from rich.panel import Panel
from rich.json import JSON
from langchain_core.messages import HumanMessage
from .agent import agent

console = Console()
logger = logging.getLogger(__name__)

async def run_conversation(
    query: str,
    app_name: str = "burpla",
    user_id: str = "something",
    session_id: str = "something",
):
    config = {"configurable": {"thread_id": session_id}}

    console.print(Panel(f"[bold cyan]{query}[/bold cyan]", title="[bold green]User Query[/bold green]"))

    final_response = ""

    async for event in agent.astream_events(
        {"messages": [HumanMessage(content=query)]},
        config=config,
        version="v2"
    ):
        kind = event["event"]

        if kind == "on_tool_start":
            tool_name = event['name']
            tool_input = event['data'].get('input')
            console.print(Panel(JSON(json.dumps(tool_input)), title=f"[bold yellow]🛠️ Calling Tool: {tool_name}[/bold yellow]", border_style="yellow"))

        elif kind == "on_tool_end":
            tool_name = event['name']
            tool_output = event['data'].get('output')

            # Format output for display
            if isinstance(tool_output, dict):
                output_str = json.dumps(tool_output, indent=2)
            else:
                output_str = str(tool_output)

            # Truncate if too long
            display_str = output_str[:1000] + "..." if len(output_str) > 1000 else output_str

            try:
                if isinstance(tool_output, dict):
                    content = JSON(display_str) if len(output_str) <= 1000 else display_str
                else:
                    content = display_str
            except:
                content = display_str

            console.print(Panel(content, title=f"[bold green]✅ Tool Output: {tool_name}[/bold green]", border_style="green"))

        elif kind == "on_chat_model_end":
            output = event['data'].get('output')
            if output and hasattr(output, 'content') and output.content:
                # If it has tool_calls, it's not the final answer yet.
                if not output.tool_calls:
                     final_response = output.content

    console.print(Panel(final_response, title="[bold purple]🏁 Final Response[/bold purple]", border_style="purple"))
    return final_response

from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings


def get_chat_model(temperature: float | None = None) -> ChatGoogleGenerativeAI:
    """LangChain wrapper over Gemini — used by LangGraph nodes (bind_tools, ainvoke)."""
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.google_api_key,
        temperature=settings.llm_temperature if temperature is None else temperature,
        convert_system_message_to_human=False,
    )


# --- Reference: raw Google Gen AI SDK with automatic function calling ----------
# Shows the brief's "Google Gen AI SDK" path directly. The orchestrator below
# uses the LangChain wrapper instead (cleaner inside LangGraph), but both call
# the same Gemini models. Use this if you prefer SDK-native tool calling.
def raw_gemini_tool_loop(system_prompt: str, user_message: str,
                         tool_functions: list, model: str | None = None) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.google_api_key)
    chat = client.chats.create(
        model=model or settings.gemini_model,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            tools=tool_functions,  # plain python callables → auto function calling
        ),
    )
    # The SDK executes the tools and feeds stdout/stderr back automatically,
    # which is exactly what lets a QA agent self-correct after a failed test run.
    return chat.send_message(user_message).text

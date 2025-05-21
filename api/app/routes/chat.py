from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import os
from dotenv import load_dotenv
import re

load_dotenv()

router = APIRouter()
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=DEEPSEEK_API_KEY,
)

class ChatMessage(BaseModel):
    message: str

def format_response(text: str) -> str:
    # Replace multiple newlines with double newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Ensure proper spacing after bullet points
    text = re.sub(r'(\*\s*[^*\n]+)(\n(?!\n))', r'\1\n', text)
    
    # Add proper line breaks between sections
    text = re.sub(r'(\*\*[^*]+:\*\*)', r'\n\1\n', text)
    
    # Format bullet points consistently
    text = re.sub(r'[-•]\s*', '• ', text)
    
    # Ensure proper markdown formatting
    text = re.sub(r'\*\*([^*]+):\*\*', r'**\1:**', text)
    
    return text.strip()

@router.post("/chat")
async def chat_with_ai(chat_message: ChatMessage):
    print(f"Received chat request with message: {chat_message.message}")
    try:
        completion = client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": "https://medicobud.com/",
                "X-Title": "medicobud.com",
            },
            model="deepseek/deepseek-r1:free",
            messages=[
                {
                    "role": "user",
                    "content": chat_message.message
                }
            ]
        )
        response = completion.choices[0].message.content
        formatted_response = format_response(response)
        print(f"Sending formatted response: ")
        return {"response": formatted_response}
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
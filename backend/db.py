import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "")
client = MongoClient(MONGO_URI, server_api=ServerApi("1"))
db = client["orca_database"]
sessions_collection = db["chat_sessions"]


def get_user_sessions_db(user_id: str) -> dict:
    """Fetch all chat sessions belonging to a specific user from MongoDB Atlas."""
    user_doc = sessions_collection.find_one({"_id": user_id})
    if not user_doc or "sessions" not in user_doc:
        return {}
    return user_doc["sessions"]


def save_single_session_db(user_id: str, session_id: str, session_data: dict, history: list = None):
    """
    Atomically updates or creates a single chat session for a user without affecting others.
    Supports passing a dictionary (`session_data`) OR individual parameters (`title`, `history`).
    """
    if isinstance(session_data, dict):
        title = session_data.get("title", "New Advisory Chat")
        hist = session_data.get("history", [])
    else:
        title = session_data
        hist = history if history is not None else []

    sessions_collection.update_one(
        {"_id": user_id},
        {
            "$set": {
                f"sessions.{session_id}": {
                    "title": title,
                    "history": hist,
                }
            }
        },
        upsert=True,
    )


def delete_session_db(user_id: str, session_id: str):
    """Removes a specific session from a user's session dictionary in Atlas."""
    sessions_collection.update_one(
        {"_id": user_id}, {"$unset": {f"sessions.{session_id}": ""}}
    )


def clear_user_sessions_db(user_id: str = None):
    """
    Clears session history from MongoDB Atlas.
    - If user_id is provided, removes the 'sessions' object or document for that user.
    - If user_id is None, wipes all session documents from the collection.
    """
    if user_id:
        sessions_collection.update_one(
            {"_id": user_id},
            {"$unset": {"sessions": ""}}
        )
    else:
        sessions_collection.delete_many({})

import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "").strip()

# ============================================================
# MONGODB CONNECTION
# ============================================================

client = None
db = None
sessions_collection = None
users_collection = None
mongo_available = False


def connect_mongodb():
    global client
    global db
    global sessions_collection
    global users_collection
    global mongo_available

    if not MONGO_URI:
        print("⚠️ MONGO_URI not found. Running without MongoDB.")
        return

    try:
        client = MongoClient(
            MONGO_URI,
            server_api=ServerApi("1"),
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )

        # Test the connection
        client.admin.command("ping")

        db = client["orca_database"]

        sessions_collection = db["chat_sessions"]
        users_collection = db["users"]

        # Create index only after successful connection
        users_collection.create_index(
            "userId",
            unique=True
        )

        mongo_available = True

        print("✅ MongoDB connected successfully.")

    except Exception as error:
        mongo_available = False
        client = None
        db = None
        sessions_collection = None
        users_collection = None

        print("⚠️ MongoDB unavailable.")
        print(f"   Reason: {error}")
        print("   ORCA will continue without MongoDB.")


# Try to connect, but NEVER crash the backend
connect_mongodb()


# ============================================================
# CHAT SESSIONS
# ============================================================

def get_user_sessions_db(user_id: str) -> dict:
    """Fetch all chat sessions belonging to a user."""

    if not mongo_available or sessions_collection is None:
        return {}

    try:
        user_doc = sessions_collection.find_one(
            {"_id": user_id}
        )

        if not user_doc or "sessions" not in user_doc:
            return {}

        return user_doc["sessions"]

    except Exception as error:
        print(f"⚠️ Could not fetch sessions: {error}")
        return {}


def save_single_session_db(
    user_id: str,
    session_id: str,
    session_data: dict,
    history: list = None,
):
    """Create or update a single chat session."""

    if not mongo_available or sessions_collection is None:
        return False

    try:
        if isinstance(session_data, dict):
            title = session_data.get(
                "title",
                "New Advisory Chat"
            )

            hist = session_data.get(
                "history",
                []
            )

        else:
            title = session_data

            hist = (
                history
                if history is not None
                else []
            )

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

        return True

    except Exception as error:
        print(f"⚠️ Could not save session: {error}")
        return False


def delete_session_db(
    user_id: str,
    session_id: str
):
    """Remove a specific chat session."""

    if not mongo_available or sessions_collection is None:
        return False

    try:
        result = sessions_collection.update_one(
            {"_id": user_id},
            {
                "$unset": {
                    f"sessions.{session_id}": ""
                }
            },
        )

        return result.modified_count > 0

    except Exception as error:
        print(f"⚠️ Could not delete session: {error}")
        return False


def clear_user_sessions_db(
    user_id: str = None
):
    """Clear chat sessions for one user or all users."""

    if not mongo_available or sessions_collection is None:
        return False

    try:
        if user_id:
            sessions_collection.update_one(
                {"_id": user_id},
                {
                    "$unset": {
                        "sessions": ""
                    }
                },
            )
        else:
            sessions_collection.delete_many({})

        return True

    except Exception as error:
        print(f"⚠️ Could not clear sessions: {error}")
        return False


# ============================================================
# USERS
# ============================================================

def save_user_db(
    user_id: str,
    full_name: str,
    username: str,
    email: str,
):
    """Save or update a user's profile."""

    if not mongo_available or users_collection is None:
        return False

    try:
        users_collection.update_one(
            {"userId": user_id},
            {
                "$set": {
                    "userId": user_id,
                    "fullName": full_name,
                    "username": username,
                    "email": email,
                }
            },
            upsert=True,
        )

        return True

    except Exception as error:
        print(f"⚠️ Could not save user: {error}")
        return False


def get_user_db(user_id: str):
    """Get a user's profile from MongoDB."""

    if not mongo_available or users_collection is None:
        return None

    try:
        return users_collection.find_one(
            {"userId": user_id},
            {"_id": 0},
        )

    except Exception as error:
        print(f"⚠️ Could not get user: {error}")
        return None

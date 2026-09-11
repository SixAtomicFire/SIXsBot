import os
from dotenv import load_dotenv

# Carica le variabili dal file .env
load_dotenv()

# Discord Bot Token & Credentials
BOT_TOKEN = os.getenv("BOT_TOKEN")
MODRINTH_USERNAME = os.getenv("MODRINTH_USERNAME")
FIREBASE_KEY_PATH = os.getenv("FIREBASE_KEY_PATH")

# Staff Role Names
ROLE_OWNER = "SIXs"
ROLE_ADMIN = "Admin"
ROLE_MOD = "Moderator"
ROLE_HELPER = "Helper"

STAFF_ROLES = [ROLE_OWNER, ROLE_ADMIN, ROLE_MOD, ROLE_HELPER]
HIGH_STAFF_ROLES = [ROLE_OWNER, ROLE_ADMIN]
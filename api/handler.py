"""One Vercel function; real PostgreSQL is mandatory."""
import os
from core import Sessions
from db import Database
from server import make_handler

handler = make_handler(Sessions(Database(os.environ.get('DATABASE_URL'))), hosted=True)

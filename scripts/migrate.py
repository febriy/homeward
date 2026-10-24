"""Apply the initial Homeward schema to DATABASE_URL; never print credentials."""
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from dotenv import load_dotenv
from db import Database

load_dotenv(Path(__file__).resolve().parents[1] / '.env.local')
Database(os.environ.get('DATABASE_URL_UNPOOLED') or os.environ.get('DATABASE_URL')).migrate()
print('Homeward schema is ready.')

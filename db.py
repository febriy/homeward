"""PostgreSQL connections and an explicit, idempotent initial migration."""
import re
from contextlib import contextmanager
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.rows import dict_row


class Database:
    def __init__(self, url, schema='homeward'):
        if not url:
            raise RuntimeError('DATABASE_URL is required. No temporary storage is substituted.')
        if not re.fullmatch(r'[a-z][a-z0-9_]{0,62}', schema):
            raise ValueError('Invalid database schema')
        self.url, self.schema = url, schema

    @contextmanager
    def connect(self):
        with psycopg.connect(self.url, row_factory=dict_row, connect_timeout=10,
                             prepare_threshold=None) as connection:
            connection.execute(sql.SQL('SET LOCAL search_path TO {}').format(sql.Identifier(self.schema)))
            connection.execute("SET LOCAL statement_timeout = '15s'")
            yield connection

    def migrate(self):
        with psycopg.connect(self.url, connect_timeout=10, prepare_threshold=None) as connection:
            # Serialize repeated initial migrations without touching any other app schema.
            connection.execute('SELECT pg_advisory_xact_lock(hashtext(%s))', ('homeward:migrate:' + self.schema,))
            connection.execute(sql.SQL('CREATE SCHEMA IF NOT EXISTS {}').format(sql.Identifier(self.schema)))
            connection.execute(sql.SQL('SET LOCAL search_path TO {}').format(sql.Identifier(self.schema)))
            connection.execute((Path(__file__).parent / 'schema.sql').read_text())

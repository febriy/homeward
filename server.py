"""Homeward HTTP boundary, shared by local development and Vercel."""
import argparse
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
from pathlib import Path
import sys
from urllib.parse import parse_qs, urlparse

import psycopg
from core import Problem, Sessions
from db import Database

ROOT = Path(__file__).resolve().parent
CSP = "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"


def make_handler(store, origins=None, hosted=False):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass  # Never log usernames, answers, cookies or request bodies.

        def allowed_origins(self):
            if origins is not None:
                return origins
            if hosted:
                result = {os.environ.get('APP_ORIGIN', '').rstrip('/')}
                if os.environ.get('VERCEL_URL'):
                    result.add('https://' + os.environ['VERCEL_URL'])
                return result - {''}
            return {'http://127.0.0.1:%d' % self.server.server_port,
                    'http://localhost:%d' % self.server.server_port}

        def trusted(self, mutation=False):
            allowed = self.allowed_origins()
            if self.headers.get('Host') not in {urlparse(origin).netloc for origin in allowed}:
                return False
            origin = self.headers.get('Origin')
            return origin in allowed if mutation else not origin or origin in allowed

        def token(self):
            try:
                cookie = SimpleCookie(self.headers.get('Cookie', ''))
                return cookie['homeward_session'].value if 'homeward_session' in cookie else ''
            except Exception:
                return ''

        def path_parts(self):
            parsed = urlparse(self.path)
            query = parse_qs(parsed.query)
            # Vercel routes all API paths to a single Python function.
            path = '/api/' + query['route'][0] if 'route' in query else parsed.path
            return path, query

        def respond(self, body, code=200, mime='application/json; charset=utf-8', cookie=None):
            content = body if isinstance(body, bytes) else json.dumps(body, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Content-Security-Policy', CSP)
            if code == 429:
                self.send_header('Retry-After', '900')
            if cookie is not None:
                self.send_header('Set-Cookie', 'homeward_session=%s; HttpOnly; SameSite=Strict; Path=/; Max-Age=%d%s'
                                 % (cookie, 86400 if cookie else 0, '; Secure' if hosted else ''))
            self.end_headers()
            self.wfile.write(content)

        def fail(self, exc):
            if isinstance(exc, Problem):
                return self.respond({'error': str(exc)}, exc.status)
            if isinstance(exc, psycopg.errors.UniqueViolation):
                return self.respond({'error': 'That username is already in use. Choose another or sign in.'}, 409)
            if isinstance(exc, (ValueError, TypeError, KeyError, AttributeError)):
                return self.respond({'error': 'That request could not be read. Your saved work is unchanged.'}, 400)
            if isinstance(exc, (BrokenPipeError, ConnectionResetError)):
                return
            print('Homeward request failed: ' + type(exc).__name__, file=sys.stderr)
            self.respond({'error': 'Unable to reach your saved work. Keep this page open and try again.'}, 503)

        def do_GET(self):
            try:
                if not self.trusted():
                    raise Problem('Open Homeward at its configured address.', 403)
                path, query = self.path_parts()
                if path == '/api/health':
                    with store.connect() as db:
                        db.execute('SELECT 1 FROM rooms LIMIT 1')
                    return self.respond({'ok': True, 'ai': False})
                if path in ('/api/state', '/api/export'):
                    user = store.authenticate(self.token())
                    state = store.view(user, query.get('session', [None])[0])
                    if path.endswith('export'):
                        state.pop('room', None)
                        state['exported_for'] = user['name']
                    return self.respond(state)
                files = {'/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css',
                         '/practice.js': 'practice.js', '/practice.css': 'practice.css',
                         '/skills.js': 'skills.js', '/skills.css': 'skills.css'}
                for meal in ('tomato-pasta', 'rice-vegetables', 'noodle-soup', 'eggs-toast'):
                    files['/meals/' + meal + '.webp'] = 'meals/' + meal + '.webp'
                if path not in files:
                    raise Problem('Page not found.', 404)
                file = ROOT / 'public' / files[path]
                mime = mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
                self.respond(file.read_bytes(), mime=mime + ('; charset=utf-8' if mime.startswith('text/') or mime == 'application/javascript' else ''))
            except Exception as exc:
                self.fail(exc)

        def do_POST(self):
            try:
                if not self.trusted(True):
                    raise Problem('Cross-site requests are not allowed.', 403)
                if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                    raise Problem('Expected JSON.', 415)
                size = int(self.headers.get('Content-Length', '0'))
                if not 0 < size <= 32000:
                    raise Problem('Request is empty or too large.')
                body = json.loads(self.rfile.read(size))
                if not isinstance(body, dict):
                    raise Problem('Expected a JSON object.')
                path, _ = self.path_parts()
                if path in ('/api/register', '/api/login'):
                    handle = body.get('handle', '')
                    if not isinstance(handle, str):
                        raise Problem('Enter your username.')
                    store.rate_limit('auth:handle:' + handle.strip().lower(), limit=15)
                    address = self.headers.get('x-vercel-forwarded-for', '') if hosted else self.client_address[0]
                    store.rate_limit('auth:address:' + address, limit=60)
                    token = store.register(body) if path.endswith('register') else store.login(body)
                    return self.respond(store.view(store.authenticate(token)), cookie=token)
                user = store.authenticate(self.token())
                if self.headers.get('X-Profile') != user['id']:
                    raise Problem('The active profile changed. Refresh before continuing.', 409)
                if path == '/api/logout':
                    store.logout(self.token())
                    return self.respond({'ok': True}, cookie='')
                if path == '/api/new':
                    sid = store.new_session(user, body.get('title'))
                    return self.respond(store.view(user, sid))
                if path == '/api/skill':
                    from skills import update_skill
                    return self.respond(update_skill(store, user, body))
                if path == '/api/action':
                    return self.respond(store.act(user, body.get('action'), body))
                raise Problem('Action not found.', 404)
            except Exception as exc:
                self.fail(exc)
    return Handler


def main():
    from dotenv import load_dotenv
    load_dotenv(ROOT / '.env.local')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8790)
    args = parser.parse_args()
    database = Database(os.environ.get('DATABASE_URL'))
    server = ThreadingHTTPServer(('127.0.0.1', args.port), make_handler(Sessions(database)))
    print('Homeward: http://127.0.0.1:%d — saved workbook, no AI' % server.server_port, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()

import os
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

# Server HTTP minimale per soddisfare il controllo di Render Free Web Service
class DummyServerHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Bot Telegram attivo e in ascolto!")

def avvia_server_civetta():
    port = int(os.getenv("PORT", 8080))
    server = HTTPServer(("0.0.0.0", port), DummyServerHandler)
    server.serve_forever()

# Avvia il web server in un thread separato
threading.Thread(target=avvia_server_civetta, daemon=True).start()
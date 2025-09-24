#!/usr/bin/env python3
"""
Simple HTTP Server for Matrix Terminal Chatbot
Serves static files with CORS headers for development
"""

import http.server
import socketserver
import os
from urllib.parse import urlparse

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler with CORS support"""

    def end_headers(self):
        """Add CORS headers to all responses"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        """Handle preflight requests"""
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        """Override to provide cleaner logging"""
        print(f"[SERVER] {format % args}")

def start_server(port=8000):
    """Start the HTTP server"""
    try:
        # Change to the directory containing the files
        web_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(web_dir)

        with socketserver.TCPServer(("", port), CORSHTTPRequestHandler) as httpd:
            print("="*60)
            print("🎭 MATRIX TERMINAL SERVER STARTING")
            print("="*60)
            print(f"📂 Serving directory: {web_dir}")
            print(f"🌐 Server URL: http://localhost:{port}")
            print(f"🎯 Open browser to: http://localhost:{port}")
            print("="*60)
            print("💡 Press Ctrl+C to stop the server")
            print("="*60)

            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n🛑 Server stopping...")
                print("👋 Matrix Terminal Server terminated")

    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"❌ Port {port} is already in use!")
            print(f"💡 Try a different port: python server.py {port + 1}")
        else:
            print(f"❌ Error starting server: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    import sys

    # Allow custom port via command line argument
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("❌ Invalid port number. Using default port 8000.")

    start_server(port)
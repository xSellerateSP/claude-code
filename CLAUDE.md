# CLAUDE.md

This file tells Claude Code how to work inside this repo.

## Project Overview
Matrix Terminal Chatbot – a static web front-end that talks to an n8n workflow, styled like the Matrix terminal.

## Project Structure

## Run & Deploy
- **Local (no build):** `python -m http.server 8000` → http://localhost:8000  
- **Alt:** `python server.py` for CORS during dev.
- **Vercel (static):**
  - Framework: **Other**
  - **Build Command:** *(empty)*
  - **Output Directory:** *(empty)* – serve repo root
  - No `vercel.json` needed. If you later need SPA routing:
    ```json
    { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
    ```

## n8n Integration (source of truth)
- **Method:** `GET`
- **Production URL format:** `https://auton8n.xsellerate.ie/webhook/<slug>`
  - In the Webhook node, **Path must be a bare slug** (e.g. `sean-matrix-v2`), **no leading slash**, **no `webhook/` inside**.
  - After changing the path: **Deactivate → Save → Activate** to re-register.
- **Query params:** `message`, `timestamp` (ISO), `userId`
- **Response shape (canonical):**
  ```json
  [
    { "text": "Hello from the cloud! How can I assist you today?" }
  ]
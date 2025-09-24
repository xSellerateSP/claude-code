# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Matrix Terminal Chatbot Interface - A web-based front-end for n8n chatbot integration with Matrix movie-inspired terminal styling.

## Project Structure

```
/
├── index.html          # Main landing page with terminal interface
├── style.css           # Matrix-themed CSS styling and animations
├── script.js           # Chat functionality and n8n webhook integration
├── server.py           # Local development server
├── start_server.bat    # Windows batch file to start server
├── vercel.json         # Vercel deployment configuration
├── .gitignore          # Git ignore patterns
└── CLAUDE.md          # This documentation file
```

## Development Commands

This is a static web application with n8n webhook integration. To run locally:

- **Start server**: Run `python server.py` or double-click `start_server.bat` (Windows)
- **Default URL**: http://localhost:8000
- **Alternative**: Use any static file server (e.g., `python -m http.server 8000`, Live Server extension, or `npx serve`)
- **No build process**: Direct HTML/CSS/JS files, no compilation needed

### Quick Start:
1. Double-click `start_server.bat` (Windows) or run `python server.py`
2. Open browser to http://localhost:8000
3. The interface will automatically test the n8n webhook connection
4. Start chatting with your Matrix terminal!

## Architecture Overview

### Core Components:
1. **MatrixTerminal Class** (`script.js`): Main application controller
   - Handles user input and message display
   - Manages n8n webhook API communication
   - Implements Matrix visual effects and animations

2. **Terminal Interface** (`index.html`):
   - Chat message container with scrolling
   - Command-line style input prompt
   - Matrix digital rain canvas background

3. **Matrix Styling** (`style.css`):
   - Green-on-black terminal color scheme
   - Glitch effects, typing animations, scanlines
   - Responsive design for mobile/desktop

### n8n Integration:
- **Webhook configuration**: Use `/config [webhook_url]` command to set your n8n webhook URL
- **Request method**: GET with query parameters: `?message=text&timestamp=iso&userId=user`
- **Auto-testing**: Connection tested on page load with status indicators
- **Retry logic**: 3 attempts with exponential backoff (1s, 2s, 4s delays)
- **Response handling**: Supports both JSON and plain text responses
- **Fallback system**: Matrix-themed responses when webhook unavailable

### Available Commands:
- `/help` - Show available commands
- `/clear` - Clear chat history
- `/status` - Show connection status
- `/config [url]` - Set n8n webhook URL

## Configuration

1. **n8n Webhook Setup**: Configure your n8n workflow to accept GET requests
2. **Set Webhook URL**: Use `/config [your_webhook_url]` in the terminal
3. **Response Format**: Ensure n8n returns JSON with a `response` field

## Deployment

### GitHub + Vercel Deployment

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin [your-github-repo-url]
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Connect your GitHub repository to Vercel
   - Vercel will automatically detect this as a static site
   - The `vercel.json` file configures proper routing and security headers

3. **Configuration**:
   - After deployment, users must configure their webhook URL using `/config [webhook_url]`
   - No environment variables needed - webhook URLs are set at runtime

### Security Notes
- No hardcoded API keys or webhook URLs in the code
- Users configure their own webhook URLs via the `/config` command
- `.gitignore` prevents sensitive files from being committed

## Development Notes

- Pure vanilla JavaScript (no frameworks)
- CSS Grid/Flexbox for responsive layout
- Canvas-based Matrix rain effect
- Local storage could be added for webhook URL persistence
- Error handling with fallback responses for demo purposes
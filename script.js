// Matrix Terminal Chatbot JavaScript (UK edition, robust n8n handling)

class MatrixTerminal {
  constructor() {
    this.chatContainer  = document.getElementById('chat-container');
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.userInput      = null; // set in init()

    // Persisted webhook URL (per browser & domain)
    const savedUrl = localStorage.getItem('n8nWebhookUrl');
    this.n8nWebhookUrl = savedUrl && savedUrl.startsWith('http') ? savedUrl : '';

    // Retry policy
    this.maxRetries     = 3;      // total tries = maxRetries + 1
    this.baseRetryDelay = 1000;   // ms (exponential backoff)

    this.setupMatrixRain();
    this.init();
    this.testWebhookConnection();
  }

  /* ---------- Boot & UI ---------- */

  init() {
    // Bind handlers (robust: retry until the input exists)
    const bind = () => {
      this.userInput = document.getElementById('user-input');
      if (!this.userInput) return false;

      // Enter to send (no Shift). Use keydown; prevent default form submit.
      this.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // Optional: wire a Send button if present
      const sendBtn = document.getElementById('send-btn');
      if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());

      // Focus input on load
      this.userInput.focus();

      return true;
    };

    if (!bind()) {
      const timer = setInterval(() => { if (bind()) clearInterval(timer); }, 100);
    }

    // Hide boot sequence after animation
    setTimeout(() => {
      const el = document.querySelector('.boot-sequence');
      if (el) el.style.display = 'none';
    }, 3000);

    // Welcome + hint
    setTimeout(() => {
      this.addSystemMessage('Connection established. You may now communicate with the Matrix.');
      if (!this.n8nWebhookUrl) {
        this.addSystemMessage('Hint: set your webhook with /config https://auton8n.xsellerate.ie/webhook/<path>');
      }
    }, 3500);
  }

  setupMatrixRain() {
    const canvas = document.getElementById('matrix-rain');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
    const fontSize = 14;
    let columns = Math.floor(canvas.width / fontSize);
    let drops = Array.from({ length: columns }, () => 1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00ff41';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = letters[Math.floor(Math.random() * letters.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    setInterval(draw, 33);

    window.addEventListener('resize', () => {
      setSize();
      columns = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: columns }, () => 1);
    });
  }

  getCurrentTimestamp() {
    const now = new Date();
    return now.toTimeString().slice(0, 8);
  }

  addMessage(type, user, text, timestamp = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'timestamp';
    timestampSpan.textContent = `[${timestamp || this.getCurrentTimestamp()}]`;

    const userSpan = document.createElement('span');
    userSpan.className = 'user';
    userSpan.textContent = user;

    const textSpan = document.createElement('span');
    textSpan.className = 'text';
    textSpan.textContent = text;

    messageDiv.appendChild(timestampSpan);
    messageDiv.appendChild(userSpan);
    messageDiv.appendChild(textSpan);

    this.chatContainer.appendChild(messageDiv);
    this.scrollToBottom();

    if (type === 'bot-message') {
      this.typeWriterEffect(textSpan, text);
    }
  }

  addSystemMessage(text) { this.addMessage('system', 'SYSTEM', text); }
  addUserMessage(text)   { this.addMessage('user-message', 'USER', text); }
  addBotMessage(text)    { this.addMessage('bot-message', 'MATRIX', text); }

  typeWriterEffect(element, text) {
    element.textContent = '';
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(timer);
      }
    }, 30);
  }

  scrollToBottom() {
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  showLoading() { if (this.loadingOverlay) this.loadingOverlay.style.display = 'flex'; }
  hideLoading() { if (this.loadingOverlay) this.loadingOverlay.style.display = 'none'; }

  /* ---------- n8n Integration ---------- */

  // Normalised fetch that always returns { items: [{text}] }
  async sendToN8n(message) {
    if (!this.n8nWebhookUrl) throw new Error('n8n webhook URL not configured');

    // Build GET with query params (keeps browser preflight simple)
    const params = new URLSearchParams({
      message,
      timestamp: new Date().toISOString(),
      userId: 'matrix-terminal-user',
    });
    const url = `${this.n8nWebhookUrl}?${params.toString()}`;

    const ctrl = new AbortController();
    const timeoutMs = 10000;
    const timeoutId = setTimeout(() => ctrl.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain;q=0.9, */*;q=0.8',
        },
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch {}
      throw new Error(`HTTP ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}`);
    }

    // Content-Type aware handling
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const jsonData = await response.json();

      if (Array.isArray(jsonData) && jsonData.length > 0 && typeof jsonData[0]?.text === 'string') {
        return { items: jsonData };
      }
      if (jsonData && typeof jsonData.response === 'string') {
        return { items: [{ text: jsonData.response }] };
      }
      if (jsonData && typeof jsonData.text === 'string') {
        return { items: [{ text: jsonData.text }] };
      }
      return { items: [{ text: JSON.stringify(jsonData) }] };
    }

    // Fallback: not JSON
    const raw = await response.text();
    if (!raw || !raw.trim()) return { items: [{ text: '✔️ Received (no content returned).' }] };

    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0 && typeof data[0]?.text === 'string') return { items: data };
      if (data && typeof data.response === 'string') return { items: [{ text: data.response }] };
      if (data && typeof data.text === 'string') return { items: [{ text: data.text }] };
      return { items: [{ text: JSON.stringify(data) }] };
    } catch {
      return { items: [{ text: raw }] };
    }
  }

  // Exponential backoff
  async sendToN8nWithRetry(message) {
    let lastErr;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.sendToN8n(message);
      } catch (e) {
        lastErr = e;
        if (attempt === this.maxRetries) break;
        const delay = this.baseRetryDelay * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastErr;
  }

  // Configure webhook at runtime (+ persist)
  setN8nWebhookUrl(url) {
    const clean = (url || '').trim();
    this.n8nWebhookUrl = clean;
    if (clean) localStorage.setItem('n8nWebhookUrl', clean);
    this.addSystemMessage(`n8n webhook configured: ${clean || '—'}`);
    this.testWebhookConnection();
  }

  // Lightweight health check
  async testWebhookConnection() {
    if (!this.n8nWebhookUrl) {
      setTimeout(() => {
        this.addSystemMessage('🔴 n8n webhook not configured. Use /config <url> to set it.');
      }, 1000);
      return;
    }
    try {
      const testUrl = this.n8nWebhookUrl + '?ping=1';
      const res = await fetch(testUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
      setTimeout(() => {
        this.addSystemMessage(res.ok
          ? '🟢 n8n webhook connection: ONLINE'
          : '🟡 n8n webhook connection: LIMITED (will use fallback responses)'
        );
      }, 4000);
    } catch {
      setTimeout(() => {
        this.addSystemMessage('🔴 n8n webhook connection: OFFLINE (will use fallback responses)');
      }, 4000);
    }
  }

  /* ---------- Commands & Messaging ---------- */

  processCommand(command) {
    const cmd = command.toLowerCase().trim();

    switch (true) {
      case cmd === '/help':
        this.addSystemMessage('Available commands: /help, /clear, /status, /config [webhook_url]');
        break;
      case cmd === '/clear':
        this.chatContainer.innerHTML = '';
        this.addSystemMessage('Terminal cleared. Welcome back to the Matrix.');
        break;
      case cmd === '/status': {
        const status = this.n8nWebhookUrl ? 'Connected' : 'Not configured';
        this.addSystemMessage(`System status: ${status}`);
        this.addSystemMessage(`Webhook URL: ${this.n8nWebhookUrl || 'Not set'}`);
        break;
      }
      case cmd.startsWith('/config '): {
        const url = command.substring(8).trim();
        this.setN8nWebhookUrl(url);
        break;
      }
      default:
        this.addSystemMessage('Unknown command. Type /help for available commands.');
        break;
    }
  }

  async sendMessage() {
    const message = (this.userInput?.value || '').trim();
    if (!message) return;

    if (message.startsWith('/')) {
      this.addUserMessage(message);
      this.userInput.value = '';
      this.processCommand(message);
      return;
    }

    this.addUserMessage(message);
    this.userInput.value = '';
    this.showLoading();

    try {
      const { items } = await this.sendToN8nWithRetry(message);
      this.hideLoading();

      if (Array.isArray(items) && items.length) {
        for (const item of items) {
          const text = (item && typeof item.text === 'string') ? item.text : String(item ?? '');
          this.addBotMessage(text);
        }
      } else {
        this.addBotMessage('The Matrix processed your request, but no content was returned.');
      }
    } catch (error) {
      this.hideLoading();
      console.error('Error sending message:', error);

      const fallbackResponses = [
        'The Matrix is experiencing some interference. Your message has been received.',
        'Connection to the mainframe is unstable. Please standby.',
        'Your query has been processed. The Oracle will respond when ready.',
        'The system is currently under heavy load. Please be patient.',
        'Message received. The agents are analysing your request.'
      ];
      const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      this.addBotMessage(randomResponse);
    }
  }
}

/* ---------- Matrix-style effects ---------- */

class MatrixEffects {
  static addGlitchEffect(element) {
    element.classList.add('glitch');
    setTimeout(() => element.classList.remove('glitch'), 2000);
  }

  static addScanlineEffect() {
    const scanline = document.createElement('div');
    scanline.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 2px;
      background: #00ff41; box-shadow: 0 0 10px #00ff41;
      animation: scanline 3s linear infinite; z-index: 1000; pointer-events: none;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes scanline {
        0% { top: 0; }
        100% { top: 100vh; }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(scanline);

    setTimeout(() => {
      document.body.removeChild(scanline);
      document.head.removeChild(style);
    }, 3000);
  }
}

/* ---------- Boot ---------- */

document.addEventListener('DOMContentLoaded', () => {
  window.matrixTerminal = new MatrixTerminal();

  // Periodic scanline (10% chance every 5s)
  setInterval(() => {
    if (Math.random() < 0.1) MatrixEffects.addScanlineEffect();
  }, 5000);

  // Occasional glitch on title (5% every 10s)
  setInterval(() => {
    if (Math.random() < 0.05) {
      const title = document.querySelector('.glitch');
      if (title) MatrixEffects.addGlitchEffect(title);
    }
  }, 10000);
});

// Console message for developers
console.log(`
███╗   ███╗ █████╗ ████████╗██████╗ ██╗██╗  ██╗
████╗ ████║██╔══██╗╚══██╔══╝██╔══██╗██║╚██╗██╔╝
██╔████╔██║███████║   ██║   ██████╔╝██║ ╚███╔╝
██║╚██╔╝██║██╔══██║   ██║   ██╔══██╗██║ ██╔██╗
██║ ╚═╝ ██║██║  ██║   ██║   ██║  ██║██║██╔╝ ██╗
╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝

Welcome to the Matrix Terminal
Configure your n8n webhook URL using: /config [your_webhook_url]
Type /help for available commands
`);
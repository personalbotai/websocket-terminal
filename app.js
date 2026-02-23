// WebSocket Terminal Application
class WSTerminal {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.stats = { sent: 0, received: 0, startTime: null };
        this.heartbeat = null;
        
        this.initElements();
        this.bindEvents();
        this.loadSettings();
    }

    initElements() {
        this.urlInput = document.getElementById('ws-url');
        this.protocolInput = document.getElementById('ws-protocol');
        this.headersInput = document.getElementById('ws-headers');
        this.connectBtn = document.getElementById('connect-btn');
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        this.msgInput = document.getElementById('message-input');
        this.msgContainer = document.getElementById('terminal-messages');
        this.sentCount = document.getElementById('sent-count');
        this.receivedCount = document.getElementById('received-count');
        this.connDuration = document.getElementById('connection-duration');
    }

    bindEvents() {
        // Enter to send
        this.msgInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    loadSettings() {
        const saved = localStorage.getItem('ws-terminal-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            this.urlInput.value = settings.url || '';
            this.protocolInput.value = settings.protocol || '';
            this.headersInput.value = settings.headers || '';
        }
    }

    saveSettings() {
        localStorage.setItem('ws-terminal-settings', JSON.stringify({
            url: this.urlInput.value,
            protocol: this.protocolInput.value,
            headers: this.headersInput.value
        }));
    }

    toggleConnection() {
        if (this.isConnected) {
            this.disconnect();
        } else {
            this.connect();
        }
    }

    connect() {
        const url = this.urlInput.value.trim();
        if (!url) {
            alert('Masukkan URL WebSocket');
            return;
        }

        this.saveSettings();
        this.setStatus('connecting');
        this.addSystemMessage(`Connecting to ${url}...`);

        try {
            const protocols = this.protocolInput.value.trim() ? 
                this.protocolInput.value.trim().split(',').map(p => p.trim()) : [];
            
            const headers = this.parseHeaders(this.headersInput.value);
            this.socket = new WebSocket(url, protocols.length ? protocols : undefined);

            if (headers.length) {
                headers.forEach(header => {
                    const [key, value] = header.split(':').map(s => s.trim());
                    if (key && value) this.socket.setRequestHeader(key, value);
                });
            }

            this.socket.onopen = () => this.onOpen();
            this.socket.onclose = (e) => this.onClose(e);
            this.socket.onerror = (e) => this.onError(e);
            this.socket.onmessage = (e) => this.onMessage(e);
        } catch (err) {
            this.addSystemMessage(`Error: ${err.message}`, true);
            this.setStatus('disconnected');
        }
    }

    parseHeaders(text) {
        if (!text.trim()) return [];
        try {
            const obj = JSON.parse(text);
            return Object.entries(obj).map(([k, v]) => `${k}: ${v}`);
        } catch {
            // Fallback: line by line "Key: Value"
            return text.split('\n').filter(line => line.trim() && line.includes(':'));
        }
    }

    onOpen() {
        this.isConnected = true;
        this.stats.startTime = Date.now();
        this.startHeartbeat();
        this.setStatus('connected');
        this.connectBtn.textContent = 'Disconnect';
        this.addSystemMessage('Connected!');
    }

    onClose(event) {
        this.isConnected = false;
        this.stopHeartbeat();
        this.setStatus('disconnected');
        this.connectBtn.textContent = 'Connect';
        this.addSystemMessage(`Disconnected (code ${event.code})`);
    }

    onError(err) {
        this.addSystemMessage('Connection error occurred', true);
        console.error('WS Error:', err);
    }

    onMessage(event) {
        this.stats.received++;
        this.updateStats();
        this.addMessage(event.data, 'received');
    }

    sendMessage() {
        const msg = this.msgInput.value.trim();
        if (!msg || !this.isConnected) return;

        this.socket.send(msg);
        this.stats.sent++;
        this.updateStats();
        this.addMessage(msg, 'sent');
        this.msgInput.value = '';
    }

    sendQuick(cmd) {
        if (!this.isConnected) {
            alert('Belum terhubung!');
            return;
        }
        this.msgInput.value = cmd;
        this.sendMessage();
    }

    addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `msg-bubble msg-${type}`;
        div.textContent = text;
        this.msgContainer.appendChild(div);
        this.scrollToBottom();
    }

    addSystemMessage(text, isError = false) {
        const div = document.createElement('div');
        div.className = 'msg-bubble msg-system';
        if (isError) div.style.background = '#7f1d1d';
        div.textContent = `[SYSTEM] ${text}`;
        this.msgContainer.appendChild(div);
        this.scrollToBottom();
    }

    clearTerminal() {
        this.msgContainer.innerHTML = '';
        this.addSystemMessage('Terminal cleared');
    }

    scrollToBottom() {
        this.msgContainer.scrollTop = this.msgContainer.scrollHeight;
    }

    setStatus(state) {
        const classes = ['status-connected', 'status-disconnected', 'status-connecting'];
        this.statusIndicator.className = 'connection-status ' + classes[['connected','disconnected','connecting'].indexOf(state)];
        this.statusText.textContent = state.charAt(0).toUpperCase() + state.slice(1);
    }

    startHeartbeat() {
        this.heartbeat = setInterval(() => {
            if (this.stats.startTime) {
                const seconds = Math.floor((Date.now() - this.stats.startTime) / 1000);
                this.connDuration.textContent = seconds + 's';
            }
        }, 1000);
    }

    stopHeartbeat() {
        if (this.heartbeat) {
            clearInterval(this.heartbeat);
            this.heartbeat = null;
        }
        this.connDuration.textContent = '0s';
    }

    updateStats() {
        this.sentCount.textContent = this.stats.sent;
        this.receivedCount.textContent = this.stats.received;
    }
}

// Global functions for inline handlers
let terminal;
document.addEventListener('DOMContentLoaded', () => {
    terminal = new WSTerminal();
});

function toggleConnection() {
    terminal.toggleConnection();
}

function sendMessage() {
    terminal.sendMessage();
}

function sendQuick(cmd) {
    terminal.sendQuick(cmd);
}

function clearTerminal() {
    terminal.clearTerminal();
}

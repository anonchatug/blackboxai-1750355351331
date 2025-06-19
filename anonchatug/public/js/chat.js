class Chat {
    constructor(socket) {
        this.socket = socket;
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.emojiBtn = document.getElementById('emojiBtn');
        this.chatMessages = document.getElementById('chatMessages');
        this.typingIndicator = document.getElementById('typingIndicator');
        
        this.encryptionKey = null;
        this.typingTimeout = null;
        
        this.initializeEncryption();
        this.initializeEventListeners();
        this.initializeSocketListeners();
    }

    async initializeEncryption() {
        // Generate a new encryption key for this session
        this.encryptionKey = await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );
    }

    initializeEventListeners() {
        // Send message on button click or enter key
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Typing indicator
        this.messageInput.addEventListener('input', () => {
            this.socket.emit('typing', { room: this.currentRoom });
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                this.socket.emit('stopTyping', { room: this.currentRoom });
            }, 1000);
        });

        // Emoji button
        this.emojiBtn.addEventListener('click', () => this.toggleEmojiPicker());
    }

    initializeSocketListeners() {
        // Handle incoming messages
        this.socket.on('chatMessage', async (data) => {
            try {
                const decryptedMessage = await this.decryptMessage(data.message);
                this.addMessage(decryptedMessage, 'received', data.timestamp);
                this.playMessageSound();
            } catch (error) {
                console.error('Error handling incoming message:', error);
            }
        });

        // Handle typing indicators
        this.socket.on('typing', () => {
            this.showTypingIndicator();
        });

        this.socket.on('stopTyping', () => {
            this.hideTypingIndicator();
        });
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        try {
            // Encrypt the message
            const encryptedMessage = await this.encryptMessage(message);
            
            // Send the encrypted message
            this.socket.emit('chatMessage', {
                message: encryptedMessage,
                room: this.currentRoom,
                timestamp: new Date().toISOString()
            });

            // Add message to chat (unencrypted since it's our own message)
            this.addMessage(message, 'sent', new Date().toISOString());
            
            // Clear input
            this.messageInput.value = '';
            
            // Clear typing indicator
            clearTimeout(this.typingTimeout);
            this.socket.emit('stopTyping', { room: this.currentRoom });
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    }

    async encryptMessage(message) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            
            // Generate a random IV
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            
            // Encrypt the message
            const ciphertext = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                this.encryptionKey,
                data
            );

            // Combine IV and ciphertext
            return {
                iv: Array.from(iv),
                ciphertext: Array.from(new Uint8Array(ciphertext))
            };
        } catch (error) {
            console.error('Encryption error:', error);
            throw error;
        }
    }

    async decryptMessage(encryptedData) {
        try {
            const iv = new Uint8Array(encryptedData.iv);
            const ciphertext = new Uint8Array(encryptedData.ciphertext);
            
            // Decrypt the message
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                this.encryptionKey,
                ciphertext
            );

            // Convert the decrypted data back to text
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption error:', error);
            throw error;
        }
    }

    addMessage(message, type, timestamp) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', type);
        
        const time = new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageElement.innerHTML = `
            <div class="message-content">
                ${this.escapeHtml(message)}
                <span class="timestamp">${time}</span>
                ${type === 'sent' ? '<span class="status"><i class="fas fa-check-double"></i></span>' : ''}
            </div>
        `;

        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        this.typingIndicator.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
    }

    hideTypingIndicator() {
        this.typingIndicator.innerHTML = '';
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    toggleEmojiPicker() {
        // Simple emoji picker implementation
        const emojis = ['😊', '😂', '❤️', '👍', '😎', '🎉', '🤔', '😅'];
        const picker = document.createElement('div');
        picker.classList.add('emoji-picker');
        picker.style.position = 'absolute';
        picker.style.bottom = '60px';
        picker.style.left = '10px';
        picker.style.background = '#fff';
        picker.style.border = '1px solid #ddd';
        picker.style.borderRadius = '8px';
        picker.style.padding = '5px';
        picker.style.display = 'grid';
        picker.style.gridTemplateColumns = 'repeat(4, 1fr)';
        picker.style.gap = '5px';

        emojis.forEach(emoji => {
            const button = document.createElement('button');
            button.textContent = emoji;
            button.style.border = 'none';
            button.style.background = 'none';
            button.style.cursor = 'pointer';
            button.style.fontSize = '20px';
            button.onclick = () => {
                this.messageInput.value += emoji;
                picker.remove();
            };
            picker.appendChild(button);
        });

        document.addEventListener('click', (e) => {
            if (!picker.contains(e.target) && e.target !== this.emojiBtn) {
                picker.remove();
            }
        });

        this.emojiBtn.parentElement.appendChild(picker);
    }

    playMessageSound() {
        // You can implement message sound here
        // const audio = new Audio('path/to/message-sound.mp3');
        // audio.play();
    }

    escapeHtml(unsafe) {
        const div = document.createElement('div');
        div.textContent = unsafe;
        return div.innerHTML;
    }

    setCurrentRoom(roomId) {
        this.currentRoom = roomId;
        this.chatMessages.innerHTML = ''; // Clear chat history for new room
    }
}

// Initialize chat when socket is available
document.addEventListener('DOMContentLoaded', () => {
    const socket = io('http://localhost:3000', {
        transports: ['websocket', 'polling']
    });
    window.chat = new Chat(socket);
});

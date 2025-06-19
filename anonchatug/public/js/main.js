class AnonChat {
    constructor() {
        console.log('Initializing AnonChat...');
        this.initializeProperties();
        this.initializeSocketConnection();
        this.waitForDOMContent();
    }

    initializeProperties() {
        this.localStream = null;
        this.peerConnection = null;
        this.currentRoom = null;
        this.peerConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    initializeSocketConnection() {
        this.socket = io('http://localhost:3000', {
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('Socket connected successfully with ID:', this.socket.id);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    }

    waitForDOMContent() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeUIElements();
                this.initializeEventListeners();
            });
        } else {
            this.initializeUIElements();
            this.initializeEventListeners();
        }
    }

    initializeUIElements() {
        console.log('Initializing UI elements...');
        
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.partnerLocation = document.getElementById('partnerLocation');
        
        this.genderSelect = document.getElementById('gender-select');
        this.chatScreen = document.getElementById('chat-screen');
        this.loadingScreen = document.getElementById('loadingScreen');

        this.maleBtn = document.getElementById('maleBtn');
        this.femaleBtn = document.getElementById('femaleBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.toggleVideoBtn = document.getElementById('toggleVideoBtn');
        this.toggleAudioBtn = document.getElementById('toggleAudioBtn');
        this.reportBtn = document.getElementById('reportBtn');

        console.log('UI elements initialized');
    }

    initializeEventListeners() {
        console.log('Initializing event listeners...');

        if (this.maleBtn) {
            this.maleBtn.onclick = () => {
                console.log('Male button clicked');
                this.startChat('male');
            };
        }

        if (this.femaleBtn) {
            this.femaleBtn.onclick = () => {
                console.log('Female button clicked');
                this.startChat('female');
            };
        }

        if (this.toggleVideoBtn) {
            this.toggleVideoBtn.onclick = () => this.toggleVideo();
        }
        if (this.toggleAudioBtn) {
            this.toggleAudioBtn.onclick = () => this.toggleAudio();
        }
        if (this.nextBtn) {
            this.nextBtn.onclick = () => this.findNewPartner();
        }

        console.log('Event listeners initialized successfully');
    }

    async startChat(gender) {
        console.log('Starting chat with gender:', gender);
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            if (this.localVideo) {
                this.localVideo.srcObject = this.localStream;
            }
            
            if (this.genderSelect && this.chatScreen) {
                this.genderSelect.classList.remove('active');
                this.chatScreen.classList.add('active');
            }
            
            this.socket.emit('join', { gender });
        } catch (error) {
            console.error('Error starting chat:', error);
            alert('Unable to access camera/microphone. Please ensure you have given permission.');
        }
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                if (this.toggleVideoBtn) {
                    this.toggleVideoBtn.innerHTML = videoTrack.enabled ? 
                        '<i class="fas fa-video"></i>' : 
                        '<i class="fas fa-video-slash"></i>';
                }
            }
        }
    }

    toggleAudio() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                if (this.toggleAudioBtn) {
                    this.toggleAudioBtn.innerHTML = audioTrack.enabled ? 
                        '<i class="fas fa-microphone"></i>' : 
                        '<i class="fas fa-microphone-slash"></i>';
                }
            }
        }
    }

    findNewPartner() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        if (this.remoteVideo) {
            this.remoteVideo.srcObject = null;
        }
        this.currentRoom = null;
        this.socket.emit('join', {});
    }
}

window.addEventListener('load', () => {
    window.anonChat = new AnonChat();
});

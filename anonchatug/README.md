# AnonChat

Anonymous video chat application with location sharing and encrypted messaging.

## Features

- Random video chat pairing
- Real-time location sharing based on IP
- End-to-end encrypted text chat
- Typing indicators
- Emoji support
- Report system for inappropriate content
- Mobile-responsive design

## Tech Stack

- Node.js & Express
- Socket.IO for real-time communication
- WebRTC for video/audio streaming
- Web Crypto API for message encryption

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/anonchatug.git
cd anonchatug
```

2. Install dependencies:
```bash
npm install
```

3. Create a .env file in the root directory:
```bash
PORT=3000
SESSION_SECRET=your_secret_here
```

4. Start the development server:
```bash
npm run dev
```

5. Visit http://localhost:3000 in your browser

## Deployment to Railway.app

1. Create a Railway account at https://railway.app

2. Install Railway CLI:
```bash
npm i -g @railway/cli
```

3. Login to Railway:
```bash
railway login
```

4. Initialize Railway project:
```bash
railway init
```

5. Deploy to Railway:
```bash
railway up
```

6. Set environment variables in Railway dashboard:
- SESSION_SECRET
- NODE_ENV=production

7. Your app will be deployed and available at the URL provided by Railway

## Security Considerations

- All chat messages are end-to-end encrypted using the Web Crypto API
- Video/audio streams are encrypted using WebRTC's built-in DTLS-SRTP
- User locations are approximated using IP addresses only
- Report system for flagging inappropriate content
- Admin panel for content moderation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details

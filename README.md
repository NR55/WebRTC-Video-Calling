# WaveTalk

WaveTalk is a WebRTC-based video calling service built with NodeJS, PeerJS, Express, and MongoDB. This project was developed between January 2024 and March 2024. The application allows users to create rooms with unique IDs, enabling participants to communicate via video, audio, and chat in real-time.

## Features

- **WebRTC Video Calling**: Real-time video and audio communication between participants.
- **Unique Room IDs**: Each room is assigned a unique ID to allow participants to join specific rooms.
- **Chat Functionality**: Participants can send text messages within the room.
- **PeerJS Integration**: Utilizes PeerJS to establish WebRTC data channels, enabling real-time data broadcasting from each participant to all other participants within the room.

## Requirements

- **NodeJS**: v14.x or higher
- **Express**: v4.x or higher
- **PeerJS**: v1.x or higher
- **MongoDB**: v4.x or higher

## Setup Instructions

To set up the server from scratch, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/NR55/WebRTC-Video-Calling.git
   cd WebRTC-Video-Calling
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Run the PeerJS Server**:
   ```bash
   peerjs --port 3001
   ```

4. **Run the MongoDB server**:
   ```bash
   mongod
   ```

5. **Run the server**:
   ```bash
   npm run startDev
   ```

6. **Access the application**:
   Open your web browser and navigate to `http://localhost:3000`.

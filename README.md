# ✨ RockLink
### AI-Powered Real-Time Rock Paper Scissors using Computer Vision

<p align="center">

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-black?logo=socketdotio)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Hand%20Tracking-4285F4)
![License](https://img.shields.io/badge/License-MIT-green)

</p>

---

## 🎮 Overview

RockLink is a modern browser-based **Rock Paper Scissors** game powered entirely by **Computer Vision**.

Instead of clicking buttons, players use **real hand gestures** detected through their webcam using **Google MediaPipe Hands**.

RockLink supports:

- 🎯 Real-time Multiplayer
- 🤖 Player vs AI
- ✋ Hand Gesture Recognition
- 📷 Live Camera Tracking
- ⚡ Socket.IO Networking
- 🎨 Premium Game UI
- 📱 Responsive Design

All gesture detection happens **locally on the device**—video is **never uploaded**.

---

# 🚀 Features

## 🎮 Multiplayer

- Create private rooms
- Join via Room Code
- Invite using shareable links
- Real-time synchronization
- Ready system
- Countdown synchronization
- Automatic winner detection
- Rematch support
- Connection recovery

---

## 🤖 Player vs AI

Challenge an intelligent AI opponent with multiple difficulty levels.

### Difficulty Modes

- 🟢 Easy
- 🔵 Normal
- 🟠 Hard
- 🔴 Adaptive

Adaptive AI studies recent player moves and adjusts its strategy dynamically.

---

## 🏆 Match Modes

Choose between:

- Best of 3
- Best of 5

Instead of ending after every round, RockLink tracks the entire match and declares a final winner.

---

## ✋ Computer Vision

Powered by **Google MediaPipe Hands**

Features:

- Live hand tracking
- Gesture classification
- Gesture stabilization
- Confidence detection
- Camera calibration
- Real-time gesture locking

Supported gestures:

- ✊ Rock
- ✋ Paper
- ✌️ Scissors

---

## 🎨 Modern UI

- Futuristic HUD
- Camera overlays
- Smooth animations
- Responsive layout
- Dark premium theme
- Mobile-friendly interface

---

# 🏗 Architecture

```
                   React Client
                        │
                        │
              MediaPipe Hand Tracking
                        │
                Gesture Recognition
                        │
                Game State Manager
                        │
             Socket.IO Client (PvP)
                        │
                 Express Server
                        │
               Room Management
                        │
             Multiplayer Synchronization
```

---

# 🧠 AI System

The AI uses four different strategies.

## Easy

Completely random.

```
Player
   ↓
Random Move
```

---

## Normal

Mostly random with occasional counters.

---

## Hard

Predicts the player's previous move and counters it most of the time.

---

## Adaptive

Keeps track of recent rounds and predicts the player's behavior.

```
Player History

Rock
Rock
Paper
Rock
Scissors

↓

Pattern Analysis

↓

Counter Move
```

---

# ⚙ Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Framer Motion
- Zustand
- React Router

---

## Backend

- Node.js
- Express
- Socket.IO

---

## Computer Vision

- Google MediaPipe Hands

---

## Development

- pnpm Workspace
- ESLint
- TypeScript

---

# 📂 Project Structure

```
RockLink
│
├── apps
│   ├── client
│   └── server
│
├── packages
│   └── shared-types
│
├── README.md
├── package.json
└── pnpm-workspace.yaml
```

---

# ⚡ Installation

## Requirements

- Node.js 20+
- pnpm

Install pnpm if needed:

```bash
npm install -g pnpm
```

---

## Clone

```bash
git clone https://github.com/yourusername/rocklink.git

cd rocklink
```

---

## Install Dependencies

```bash
pnpm install
```

---

## Start Server

```bash
pnpm dev:server
```

---

## Start Client

```bash
pnpm dev:client
```

---

Open

```
http://localhost:5173
```

---

# 📱 Mobile Testing

For LAN testing:

1. Connect laptop and phone to the same Wi-Fi.
2. Start the development server.
3. Open the LAN URL shown by Vite.

Example:

```
https://192.168.x.x:5173
```

> Camera access on mobile requires a secure HTTPS context.

---

# 🎮 Gameplay Flow

## Multiplayer

```
Create Room

↓

Share Link

↓

Opponent Joins

↓

Ready

↓

Countdown

↓

Gesture Detection

↓

Both Locked

↓

Winner

↓

Next Round

↓

Final Match Winner
```

---

## AI Mode

```
Choose Difficulty

↓

Choose Match Length

↓

Camera Calibration

↓

Gesture Lock

↓

AI Thinking

↓

Round Result

↓

Score Update

↓

Next Round

↓

Match Winner
```

---

# 🔒 Privacy

RockLink performs gesture recognition locally.

✔ Camera stays on your device.

✔ No images are uploaded.

✔ Only gameplay events are sent over Socket.IO.

---

# 📈 Future Improvements

- Voice Chat
- Spectator Mode
- Match Replay
- Online Leaderboards
- User Accounts
- Tournament Mode
- Gesture Customization
- Additional Hand Games
- Mobile PWA
- WebRTC Multiplayer

---

# 🛠 Challenges Solved

- Stable real-time gesture recognition
- Camera synchronization
- Multiplayer state consistency
- AI difficulty balancing
- Gesture stabilization
- Reconnection handling
- Low-latency networking
- Cross-device compatibility

---

# 📸 Screenshots

```
Add screenshots here

Home Screen

Lobby

Gameplay

Player vs AI

Winner Screen

Mobile Layout
```

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch

```
git checkout -b feature/new-feature
```

3. Commit your changes

```
git commit -m "Add new feature"
```

4. Push

```
git push origin feature/new-feature
```

5. Open a Pull Request

---

# 📜 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

**Rishant Ranjan**

B.Tech – Information Science & Engineering

REVA University

GitHub: https://github.com/yourusername

LinkedIn: https://linkedin.com/in/yourprofile

---

## ⭐ If you like this project, consider giving it a star!

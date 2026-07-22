Here is a premium, comprehensive `README.md` tailored specifically for your stabilized RockLink repository. It covers the technical architecture, features, and the precise Windows/Mobile setup workflow we established.

You can copy this entirely and replace your current `README.md`.

---

```markdown
# 🤘 RockLink

**The Hand is the Hardware.**  
RockLink is a real-time, computer-vision-powered Rock, Paper, Scissors multiplayer game. It uses on-device machine learning to track your hand gestures through your webcam or mobile camera, battling either a local AI or a human opponent over your local network.

![RockLink UI](./image_6c68dc.png)

## ✨ Features

* **Hardware-Free Tracking:** No controllers needed. Uses Google MediaPipe to detect hand landmarks locally on your device in real-time.
* **Premium Cinematic UI:** A dark, technical, computer-vision aesthetic featuring responsive layouts, cyan/amber accents, and minimal latency.
* **Intelligent AI Engine:** Play against the computer in Easy, Normal, Hard, or Adaptive difficulty modes.
* **LAN Multiplayer:** Create a room and invite a friend on the same Wi-Fi network. Features a highly stable, state-based connection using Socket.IO.
* **Best-of-Series Matches:** Configurable match lengths (Best of 3, Best of 5) with fluid round-to-round cinematic transitions.
* **Cross-Device Support:** Play laptop vs. laptop, or laptop vs. mobile. Each device handles its own camera feed securely and locally.

## 🛠 Tech Stack

* **Frontend:** React 18, Vite, TypeScript, TailwindCSS, Framer Motion
* **Backend:** Node.js, Express, Socket.IO
* **Machine Learning:** Google MediaPipe (Hands)
* **Architecture:** Monorepo using `pnpm` workspaces

## 🚀 Windows Local Setup & Mobile Testing

Because mobile browsers strictly enforce secure contexts for camera access (`navigator.mediaDevices.getUserMedia`), RockLink requires a local HTTPS setup using `mkcert` to function across your LAN.

### 1. Prerequisites
* **Node.js** (v18 or higher)
* **pnpm** (`npm install -g pnpm`)
* **Chocolatey** (Windows package manager)

### 2. Install Dependencies
```bash
pnpm install

```

### 3. Generate Local Certificates

Open **PowerShell as Administrator** and run the following commands to install `mkcert` and create your local Certificate Authority (CA):

```powershell
choco install mkcert
mkcert -install

```

Next, find your computer's local LAN IP address:

```powershell
ipconfig
# Look for the "IPv4 Address" under your active Wi-Fi/Ethernet adapter (e.g., 192.168.1.50)

```

Create a `certs` folder in the project root and generate the certificates for both `localhost` and your LAN IP:

```powershell
mkdir certs
cd certs
mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 <YOUR-LAN-IP>
cd ..

```

*(Note: Do not commit these `.pem` files. The `certs/` directory is in the `.gitignore`.)*

### 4. Running the Development Servers

From the root directory, start both the backend socket server and the frontend Vite proxy:

**Start the Server:**

```bash
pnpm dev:server

```

**Start the Client:**

```bash
pnpm dev:client

```

## 📱 Connecting a Mobile Device (LAN Multiplayer)

To play against a phone on your network, the phone must trust the local CA you just created, or its browser will block the camera.

1. **Find your Root CA:** In your terminal, run `mkcert -CAROOT`. This will output a folder path. Go to that folder and locate `rootCA.pem`.
2. **Host the CA:** Host that folder temporarily using Python so your phone can download it:
```bash
python -m http.server 8080

```


3. **Download on Phone:** Open your mobile browser and navigate to `http://<YOUR-LAN-IP>:8080/rootCA.pem`.
4. **Trust the Certificate:**
* **iOS:** Settings > Profile Downloaded > Install. Then go to Settings > General > About > Certificate Trust Settings > toggle your mkcert root to **ON**.
* **Android:** Settings > Security > Encryption & credentials > Install a certificate > CA certificate > Select the downloaded file.


5. **Play:** Open `https://<YOUR-LAN-IP>:5173` on your mobile browser. The camera permissions will now prompt successfully!

## 📁 Project Structure

```text
rocklink/
├── apps/
│   ├── client/          # React/Vite frontend (UI, Camera pipelines, Socket client)
│   └── server/          # Node/Express backend (Room management, Socket server)
├── packages/
│   └── shared-types/    # Shared TypeScript interfaces (Game rules, Socket events)
├── certs/               # Local HTTPS certificates (git-ignored)
├── public/              # MediaPipe WASM/Data models
├── .gitignore
├── package.json
└── pnpm-workspace.yaml

```

## 🧠 Architecture Notes

* **Same-Origin Sockets:** The client connects to `window.location.hostname` via a Vite proxy. This eliminates complex CORS configurations during local LAN development.
* **Decentralized Processing:** Video frames are **never** transmitted over the network. MediaPipe inference happens 100% on the client device. Only lightweight, serialized game states (e.g., `ROOM:JOIN`, `GESTURE:LOCKED`) are sent through Socket.IO.
* **In-Flight Guards:** The MediaPipe event loop is guarded against overlapping `send()` requests to prevent WASM thread freezing during high CPU loads or thermal throttling on mobile devices.

```

```

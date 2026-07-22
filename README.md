# RockLink

Real-time Rock Paper Scissors using local hand-gesture detection. Camera frames
and MediaPipe inference remain on each player's device; Socket.IO carries only
room and game events.

## Windows Local Setup & Mobile Testing

1. **Install Prerequisites**: Node.js (v18+) and `pnpm`.
2. **Install Dependencies**: Run `pnpm install` in the project root.
3. **Install mkcert**: Open PowerShell as Administrator and run `choco install mkcert`.
4. **Generate Local CA**: Run `mkcert -install` to install the local Root CA on your laptop.
5. **Find your LAN IP**: Run `ipconfig` in PowerShell and note your IPv4 Address (e.g., `192.168.1.50`).
6. **Generate Certificates**:
   * `mkdir certs`
   * `cd certs`
   * `mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 <YOUR-LAN-IP>`
7. **Trust CA on Phone**:
   * Host the Root CA (found by running `mkcert -CAROOT`) on a simple python server (`python -m http.server 8080`).
   * Download the `rootCA.pem` file on your phone.
   * iOS: Settings > Profile Downloaded > Install. Then Settings > General > About > Certificate Trust Settings > Enable full trust.
   * Android: Settings > Security > Encryption & credentials > Install a certificate > CA certificate.
8. **Start Application**: Run `pnpm dev:server` and `pnpm dev:client`.
9. **Access**:
   * Laptop: `https://localhost:5173`
   * Phone: `https://<YOUR-LAN-IP>:5173`

The Vite HTTPS server proxies `/socket.io` to the local HTTP game server, so
the browser uses a same-origin secure WebSocket connection without a LAN-IP
socket environment variable.

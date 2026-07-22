# HTTPS LAN camera testing

Camera access on a phone requires HTTPS. The client now uses the current LAN
host for Socket.IO automatically, so both dev servers should use the same
certificate and LAN IP address.

1. Install `mkcert`, then run `mkcert -install` once.
2. From the repository root, issue a certificate for the PC's LAN IP:

   ```powershell
   New-Item -ItemType Directory -Force .certs
   mkcert -key-file .certs/rocklink-lan-key.pem -cert-file .certs/rocklink-lan.pem 192.168.1.9 localhost 127.0.0.1 ::1
   ```

3. Copy `apps/client/.env.https.example` to `apps/client/.env`.
4. Set `apps/server/.env` to:

   ```dotenv
   CLIENT_ORIGIN=https://192.168.1.9:5173
   PORT=4000
   HTTPS=true
   HTTPS_CERT_PATH=../../.certs/rocklink-lan.pem
   HTTPS_KEY_PATH=../../.certs/rocklink-lan-key.pem
   ```

5. Start `pnpm.cmd dev:server` and `pnpm.cmd dev:client`, then open
   `https://192.168.1.9:5173` on the phone.

The phone must trust the local CA installed by mkcert. Reissue the certificate
and update `CLIENT_ORIGIN` if your LAN IP changes.

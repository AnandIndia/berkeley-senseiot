# Berkeley SenseIoT — IoT Asset Telemetry & CAFM Integration Portal

**Defined by Trust**

Berkeley SenseIoT is a full-stack, lightweight, and customizable IoT Asset Monitoring Portal with built-in IoT gateway connectivity, real-time sensor analytics, alarm detection, dynamic custom fields, stateflow lifecycle builder, and two-way **Facilio CAFM** integration.

---

## 📂 Project Structure
```
berkeley-senseiot/
├── package.json          # Node.js project manifest
├── server.js             # High-speed HTTP server, REST APIs & IoT Ingest
├── Dockerfile            # Container definition for cloud/server deployment
├── render.yaml           # 1-Click free cloud hosting definition (Render.com)
├── start.bat             # 1-Click Windows startup script
├── start.sh              # 1-Click Linux/macOS startup script
├── public/               # Frontend Web & Mobile Portal
│   ├── index.html        # Main application dashboard & views
│   ├── styles.css        # Berkeley brand styling & responsive layout
│   ├── app.js            # Real-time polling, charts, stateflow & CAFM sync
│   └── assets/
│       └── berkeley-logo.png  # Berkeley logo image
└── data/
    └── senseiot_db.json  # Auto-persisting JSON database (Assets, Gateways, Alarms)
```

---

## 🚀 Option 1: Deploy on FREE Cloud Hosting in 3 Minutes

### A. Deploy on Render.com (Recommended — 100% Free)
1. Push this folder to a GitHub repository (or create a new GitHub repo e.g., `berkeley-senseiot`).
2. Go to [Render.com](https://render.com) and sign up for free.
3. Click **"New +"** $\rightarrow$ **"Web Service"** and connect your GitHub repo.
4. Set:
   - **Environment**: `Node`
   - **Build Command**: *(leave empty)*
   - **Start Command**: `node server.js`
5. Click **"Deploy Web Service"**.
6. Render will assign you a live HTTPS URL (e.g. `https://berkeley-senseiot.onrender.com`).

---

### B. Deploy on Railway.app / Koyeb / Glitch (Alternative Free Hosts)
- **Railway.app**: New Project $\rightarrow$ Deploy from GitHub repo $\rightarrow$ Railway auto-detects `Dockerfile` or `package.json` $\rightarrow$ Live URL generated.
- **Koyeb**: New App $\rightarrow$ GitHub $\rightarrow$ Deploy Docker or Node $\rightarrow$ Free live instance.
- **Glitch.com**: Import from Git repo $\rightarrow$ Runs instantly in browser sandbox.

---

### C. Share Instantly with a Public HTTPS Link (via ngrok / Cloudflare Tunnel)
If you want to share the live portal running on this machine with colleagues right now without uploading to GitHub:

```bash
# Using Cloudflare Quick Tunnel (Free, no account required)
npx cloudflared tunnel --url http://localhost:3000

# Or using ngrok
npx ngrok http 3000
```
This gives you an immediate public HTTPS link (e.g. `https://random-subdomain.trycloudflare.com`) accessible from anywhere on mobile or desktop.

---

## 🏢 Option 2: Self-Host on Your Own Server / VM

### On a Windows Server / Local PC:
1. Ensure [Node.js](https://nodejs.org) (v18+) is installed.
2. Double-click `start.bat` or run:
   ```cmd
   node server.js
   ```
3. Access at `http://localhost:3000` or your server IP `http://<server-ip>:3000`.

### On a Linux / Ubuntu / Cloud Server:
```bash
# 1. Install Node.js & PM2 (Process Manager)
sudo apt update && sudo apt install -y nodejs npm
sudo npm install -g pm2

# 2. Start Berkeley SenseIoT as a background service
cd berkeley-senseiot
pm2 start server.js --name "berkeley-senseiot"
pm2 save
pm2 startup
```

### Using Docker:
```bash
# 1. Build Docker image
docker build -t berkeley-senseiot .

# 2. Run container on port 3000
docker run -d -p 3000:3000 --name senseiot berkeley-senseiot
```

---

## 📡 Ingesting Real IoT Gateway Telemetry

Point your IoT Gateway (Advantech, Teltonika, Modbus bridge, Raspberry Pi, ESP32) to:
- **URL**: `POST http://<your-server-ip>:3000/api/telemetry/ingest`
- **Header**: `Content-Type: application/json`
- **Header**: `X-Gateway-Key: gw_key_central_plant_9918`
- **Payload**:
```json
{
  "readings": [
    { "assetId": "AST-101", "sensorId": "SNS-101-1", "sensorType": "temperature", "value": 13.8 },
    { "assetId": "AST-101", "sensorId": "SNS-101-2", "sensorType": "vibration", "value": 2.1 }
  ]
}
```

---

## 🔗 Facilio CAFM Integration
Configure your Facilio credentials in **Settings** $\rightarrow$ **Facilio CAFM**:
- **API URL**: `https://app.facilio.com/api/v3`
- **Organization ID**: `FACILIO_BERKELEY_904`
- **API Key**: `fc_live_...`
- Critical alarms will automatically trigger emergency Work Orders with mapped failure details.

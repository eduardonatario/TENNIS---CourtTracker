# CourtTracker — Tennis Motion Analytics

Professional tennis performance and motion analysis web application featuring interactive **Apple Watch** & **iPhone (iOS)** companion app simulators, CoreMotion telemetry collection, real-time stroke detection (Forehand, Backhand, Saque), Recharts telemetry dashboards, and session export (CSV/JSON).

---

## Features

- **Apple Watch Simulator**:
  - Splash screen with custom tennis serve icon (`Saque`).
  - Main menu with options: **COLETAR DADOS** (ML training data collection with custom statistics icon) and **JOGAR E DETECTAR** (Live match motion detection with tennis ball icon).
  - Active collection timer ("Selecione e repita o movimento") with live feedback.
  - Live match detection screen with live match timer (**TEMPO DE PARTIDA**) and pulsing gray/black **FINALIZAR PARTIDA** button.
- **iPhone Companion App Simulator**:
  - Concentrator app displaying synced captures using native stroke icon sprites.
  - Real-time telemetry sync via simulated WCSession.
- **Telemetry & Analytics Dashboard**:
  - Real-time acceleration graphs (X, Y, Z axes magnitude).
  - Session history management and CSV/JSON data export.
- **Xcode & watchOS Guide**:
  - Complete integration guide for CoreMotion (`CMMotionManager`), WCSession, and WatchConnectivity.

---

## Getting Started Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/court-tracker.git
   cd court-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## GitHub Pages Deployment

This repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys the app to GitHub Pages whenever changes are pushed to the `main` or `master` branch.

1. Ensure GitHub Pages is enabled in your repository settings (Settings > Pages > Build and deployment source: **GitHub Actions**).
2. Push your changes to `main` or `master`.

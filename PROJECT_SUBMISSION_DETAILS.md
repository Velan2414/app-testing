# MediQR Project Submission Details

This document contains all critical setup, configuration, database credentials, and deployment details required for evaluating, running, and submitting the MediQR project.

---

## 1. Database Server & Connection Details
The project utilizes a hosted **Supabase PostgreSQL** database instance. The tables are configured using standard SQL rules defined in [database.sql](file:///c:/Users/SABARI/Music/Velan/fullweb/fullweb/backend/database.sql).

* **Database Engine**: PostgreSQL 15+ (Hosted via Supabase)
* **Connection Type**: Transaction Pooler (Session-enabled connection)
* **Host / Server Name**: `aws-1-ap-south-1.pooler.supabase.com`
* **Port**: `6543` (Connection Pooler)
* **Direct Port**: `5432` (Direct connection port)
* **Database Name**: `postgres`
* **Username**: `postgres.jnsuxuhyhrkntnifovkl`
* **Password**: `Velan@2005000`
* **SSL Settings**: Required (`sslmode=require`)
* **Connection String (URI)**:
  ```
  postgresql://postgres.jnsuxuhyhrkntnifovkl:Velan%402005000@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
  ```

### Configuration Tables In Use:
1. **`users` Table**: Contains account registration data (Email, Password Hash, verification status, and timestamps).
2. **`profiles` Table**: Holds patient clinical details, medical record JSON documents (`patient_record`), setting configurations (`privacy_settings`), and onboarding status.

---

## 2. Server Configuration Variables
These environment values are loaded by the API layer (`api/index.js` or `backend/.env`) to authenticate sessions and connect to PostgreSQL.

| Variable Name | Description | Value |
|---|---|---|
| `DATABASE_URL` | PostgreSQL Connection URI | `postgresql://postgres.jnsuxuhyhrkntnifovkl:Velan%402005000@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require` |
| `JWT_SECRET` | Secret sign key for User Tokens | `mediqr-super-secret-key-2024` |
| `PORT` | Local Express Server port | `5000` |

---

## 3. Project Directory Structure
This is an overview of the directories and code modules in this repository:

* **`/src`**: Frontend React components & page modules.
  * **`/src/pages`**: View directories (Dashboard, Setup, Scanning page, Patient Report Card Dossier).
    * `PublicEmergencyProfile.tsx`: Responsive public emergency profile dossier card layout featuring lock overlays, stamp signatures, and hover alerts.
    * `ScanQR.tsx`: Live camera-view scanning page using browser streams and `jsQR` decoding algorithms.
    * `MyQR.tsx`: QR Code dashboard displaying the health identifier and direct report card link.
  * **`/src/components`**: Shared UI blocks (Interactive Eyes, Buttons, Input cards).
  * **`index.css`**: Tailwind UI system setups.
* **`/api`**: Backend express server controller (`index.js`) serving as serverless endpoints.
* **`/backend`**: SQL schema tables (`database.sql`) and direct local server environment variables.
* **`vercel.json`**: Deployment parameters forwarding requests to backend serverless files.

---

## 4. How to Run & Validate Locally
To start the project in your local development environment:

### Prerequisites:
* Make sure you have [Node.js (v18+)](https://nodejs.org) installed on your system.
* No additional `.env.local` is needed! The project root `.env` and `/backend/.env` files are already pre-configured with active database connection parameters for immediate execution.

### Step 1: Install Dependencies
Open your terminal in the project root folder and execute:
```bash
npm install
```

### Step 2: Start Frontend & Backend Services
To launch **both** the Vite React client and the Node Express API server concurrently:
```bash
npm run start:all
```
* **Frontend Web Dashboard**: Runs at `http://localhost:5173`
* **Backend Express Server**: Runs at `http://localhost:5000`

### Step 3: Local Network / Mobile Scanning (Highly Interactive Testing)
When running the development server:
1. **Dynamic IP Resolution**: The backend server automatically resolves your computer's local Wi-Fi IP address (e.g., `192.168.43.50`) via the `/api/network-ip` endpoint.
2. **Scannable QR Codes**: The QR code on your dashboard is dynamically generated using this local IP. This allows you to scan the QR code using a phone connected to the same Wi-Fi network to instantly display the emergency card on your mobile device!
3. **Local Testing**: Clicking "Get Report Card" on your computer opens the dossier card directly using your current origin (`http://localhost:5173/emergency/...`) for quick browser review.

---

## 5. Live Production Hosting Details
* **Frontend/API Host**: Vercel (Serverless Deployments)
* **Production Live URL**: [https://mediqrfixed.vercel.app](https://mediqrfixed.vercel.app)

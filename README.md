# QR Attendance System

A QR-based attendance tracking system for schools and universities. Teachers display a QR code, students scan it from their phones to check in.

## Features

- **Auto-refreshing QR codes** — Refreshes every 30 seconds to prevent screenshot sharing
- **Real-time check-in feed** — See students checking in as it happens
- **Mobile PWA** — Students install it on their phone like a native app
- **Attendance records** — Filter, search, and export to CSV
- **Admin management** — Create teacher accounts or promote students to admin
- **Configurable** — Set late threshold, QR refresh interval, and session duration

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- npm

### Setup
```bash
git clone <your-repo-url>
cd qr-attendance
npm install
npx prisma generate
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev
```

Open http://localhost:3000

**Default admin login:**
- Email: `admin@attendance.com`
- Password: `admin123`

---

## Deploy to Production (Google Cloud Run + Turso)

### 1. Create Turso Database
```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup
turso db create qr-attendance
turso db show qr-attendance --url       # copy the URL
turso db tokens create qr-attendance    # copy the token
```

### 2. Push Schema to Turso
Update `.env` with your Turso credentials, then:
```bash
node scripts/seed-turso.js
```

### 3. Deploy to Cloud Run
1. Push code to GitHub
2. Go to [Google Cloud Run](https://console.cloud.google.com/run) → **Create Service**
3. Select **Continuously deploy from a repository** → Connect your GitHub repo
4. Build type: **Dockerfile**
5. Port: **8080**
6. Add environment variables:
   | Variable | Value |
   |---|---|
   | `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` |
   | `TURSO_AUTH_TOKEN` | your Turso auth token |
   | `JWT_SECRET` | any random string (e.g. generate with `openssl rand -hex 32`) |
7. Click **Deploy**

Your app will be live at the Cloud Run URL with HTTPS.

---

## How to Use — Admin / Teacher Guide

### First Login
1. Go to your app URL and sign in with `admin@attendance.com` / `admin123`
2. Go to **Settings** → change the default password immediately

### Adding Teachers
Go to **Settings** and choose one of:
- **Create Admin** — Create a new teacher account directly with name, email, and password
- **Find Student** — If the teacher already registered as a student, search for them and click **Promote**

### Creating a Class
1. Go to **Classes** → click **Create Class**
2. Fill in the class name, description (optional), and schedule (optional)
3. The system generates a unique join code (e.g. `COMP-15LS`)
4. Share this code with your students — they'll use it to enroll

### Taking Attendance
1. Go to **Classes** → click on your class → click **Start Attendance Session**
2. A QR code appears on screen — display it on a projector or your laptop screen
3. Students scan the QR code from their phones
4. You'll see students appear in the **live check-in feed** as they scan
5. The QR code **auto-refreshes every 30 seconds** — students must scan the live code, not a screenshot
6. When done, click **End Session**

### Checking Attendance Records
- Go to **Attendance** → filter by class, date range, or search by student name
- Click **Export CSV** to download the records as a spreadsheet

### Manual Check-in
If a student has phone issues:
1. Go to **Students** → click **Manual Check-in**
2. Select the active session and the student
3. They'll be marked as "Manual" in the records

### Settings
Go to **Settings** to configure:
| Setting | What it does | Default |
|---|---|---|
| Late Threshold | Minutes after session starts before marking students as "late" | 10 min |
| QR Refresh Interval | How often the QR code changes (prevents screenshot sharing) | 30 sec |
| Session Duration | How long a session stays active | 120 min |

---

## How to Use — Student Guide

### Getting Started
1. Open the app URL on your phone browser
2. Tap **Register** and create your account (name, email, student ID, password)
3. **Install the app**: Tap your browser menu (three dots) → **Add to Home Screen** or **Install App**

### Joining a Class
1. Get the class code from your teacher (e.g. `COMP-15LS`)
2. Open the app → go to **Classes** → tap **+ Join**
3. Enter the code and tap **Join Class**

### Taking Attendance
1. When your teacher displays the QR code in class:
2. Open the app → tap the **Scan QR Code** card on the home screen (or go to the **Scan** tab)
3. Tap **Open Scanner** → point your camera at the QR code
4. You'll see a confirmation: **Checked In!** with your status (Present or Late)

> **Important:** You must scan the live QR code displayed by your teacher. Screenshots of old QR codes won't work — the code changes every 30 seconds.

### Viewing Your Attendance
- **Home page** — Shows your enrolled classes
- **Classes** → tap a class → See your full attendance history (dates, status, stats)
- **Profile** — Shows your overall attendance rate, sessions attended, and times late

### Navigation
The app has 4 tabs at the bottom:
| Tab | What it shows |
|---|---|
| **Home** | Welcome screen, quick scan button, your classes |
| **Classes** | All enrolled classes, join new class |
| **Scan** | QR code scanner |
| **Profile** | Your info, attendance stats, change password, log out |

---

## Mobile Access (Local Network)

To test on your phone during development:

1. Start the server: `npm run dev` or `npx next start`
2. Note the **Network** URL shown in the terminal (e.g. `http://192.168.1.2:3000`)
3. If your phone can't connect, open the firewall (run PowerShell as admin):
   ```powershell
   netsh advfirewall firewall add rule name="Next.js Dev" dir=in action=allow protocol=TCP localport=3000
   ```
4. Open the Network URL on your phone

---

## Tech Stack

| | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Turso (LibSQL) / SQLite |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| UI | Tailwind CSS + shadcn/ui |
| QR | qrcode + html5-qrcode |
| Hosting | Google Cloud Run |
| Container | Docker |

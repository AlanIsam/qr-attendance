# QR Attendance System — Documentation

## Overview

A QR-based attendance tracking system with two interfaces:
- **Admin/Teacher Dashboard** — Desktop web app for managing classes, generating QR codes, and viewing attendance data
- **Student PWA** — Mobile-first Progressive Web App for scanning QR codes and tracking attendance

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 16 (App Router) | Fullstack framework |
| Turso (LibSQL) + Prisma | Cloud database (SQLite-compatible) |
| JWT (jsonwebtoken) | Authentication |
| Tailwind CSS + shadcn/ui | Styling & UI components |
| qrcode | QR code generation (admin) |
| html5-qrcode | QR code scanning (student) |
| PWA (manifest + service worker) | Mobile installability |
| Docker | Containerization |
| Google Cloud Run | Production hosting |

## Project Structure

```
qr-attendance/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seed script (local SQLite)
│   ├── dev.db                 # Local SQLite database (dev only)
│   └── migrations/            # Prisma migrations
├── scripts/
│   └── seed-turso.js          # Seed script for Turso database
├── public/
│   ├── sw.js                  # Service worker
│   ├── offline.html           # Offline fallback page
│   ├── icon-192x192.svg       # PWA icon
│   └── icon-512x512.svg       # PWA icon
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (fonts, metadata, toaster, SW registration)
│   │   ├── manifest.ts        # PWA manifest
│   │   ├── globals.css        # Global styles + shadcn theme
│   │   ├── (auth)/            # Auth route group (login, register)
│   │   ├── (admin)/           # Admin route group
│   │   │   ├── layout.tsx     # Admin layout with sidebar
│   │   │   └── admin/
│   │   │       ├── page.tsx              # Dashboard
│   │   │       ├── classes/              # Class management
│   │   │       ├── sessions/             # Session management + live QR
│   │   │       ├── attendance/           # Attendance records + export
│   │   │       ├── students/             # Student management
│   │   │       └── settings/             # System settings + admin management
│   │   ├── (student)/         # Student route group
│   │   │   ├── layout.tsx     # Student layout with bottom nav
│   │   │   ├── page.tsx       # Student home
│   │   │   ├── classes/       # My classes + join
│   │   │   ├── scan/          # QR scanner
│   │   │   └── profile/       # Profile + stats
│   │   └── api/               # API routes
│   │       ├── auth/          # register, login, me, change-password
│   │       ├── admin/users/   # Admin user management (create, promote, demote, delete)
│   │       ├── classes/       # CRUD + enrolled students
│   │       ├── enrollments/   # Join, approve, reject, pending
│   │       ├── sessions/      # CRUD + QR token + checkins
│   │       ├── attendance/    # check-in, records, export, manual
│   │       ├── student/       # Student-specific (classes, history, stats)
│   │       └── settings/      # Global settings
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── admin/             # Admin components (sidebar)
│   │   └── student/           # Student components (bottom nav)
│   ├── lib/
│   │   ├── db.ts              # Prisma client (auto-detects Turso vs local SQLite)
│   │   ├── auth.ts            # JWT + bcrypt helpers
│   │   ├── qr.ts              # QR token generation/validation
│   │   └── utils.ts           # Utility functions
│   ├── generated/prisma/      # Generated Prisma client
│   └── proxy.ts               # Route protection (Next.js 16 middleware)
├── .env                       # Environment variables (not committed)
├── .env.example               # Example environment variables
├── Dockerfile                 # Multi-stage Docker build for Cloud Run
├── .dockerignore              # Docker ignore rules
├── next.config.ts             # Next.js configuration (standalone output)
├── prisma.config.ts           # Prisma configuration
└── package.json
```

## Database

### Turso (Production)

The app uses **Turso** (LibSQL) as the production database — a SQLite-compatible edge database. The Prisma client auto-detects the connection type:
- If `TURSO_DATABASE_URL` starts with `libsql://` → connects to Turso via `@prisma/adapter-libsql`
- Otherwise → falls back to local SQLite file (for development)

### Schema

#### User
| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| email | String (unique) | User email |
| name | String | Full name |
| studentId | String? (unique) | Student ID (null for admins) |
| passwordHash | String | Bcrypt hash |
| role | String | "admin" or "student" |
| createdAt | DateTime | Account creation date |
| updatedAt | DateTime | Last update |

#### Class
| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| name | String | Class name (e.g., "Computer Science 101") |
| code | String (unique) | Join code (e.g., "COMP-15LS") |
| description | String? | Optional description |
| schedule | String? | Schedule info (e.g., "MWF 10:00-11:00") |

#### Enrollment
| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| userId | String | FK to User |
| classId | String | FK to Class |
| status | String | "approved", "pending", or "rejected" |
| Constraint | unique(userId, classId) | One enrollment per student per class |

#### AttendanceSession
| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| classId | String | FK to Class |
| createdById | String | FK to User (admin who started it) |
| currentToken | String? | Current active QR token (UUID) |
| tokenExpiresAt | DateTime? | When current token expires |
| startedAt | DateTime | Session start time |
| endedAt | DateTime? | Session end time (null if active) |
| lateThreshold | Int | Minutes after start to mark "late" |

#### AttendanceRecord
| Field | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| sessionId | String | FK to AttendanceSession |
| userId | String | FK to User (student) |
| status | String | "present", "late", or "manual" |
| checkedAt | DateTime | Check-in timestamp |
| Constraint | unique(sessionId, userId) | One check-in per student per session |

#### Settings
| Field | Type | Default | Description |
|---|---|---|---|
| lateThreshold | Int | 10 | Minutes before marking "late" |
| qrRefreshInterval | Int | 30 | Seconds between QR token rotation |
| sessionDuration | Int | 120 | Session duration in minutes |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register student account |
| POST | /api/auth/login | Login (returns JWT + sets cookie) |
| GET | /api/auth/me | Get current user profile |
| POST | /api/auth/change-password | Change password |

### Admin User Management
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/admin/users | List users (optional `?role=admin` or `?role=student` filter) |
| POST | /api/admin/users | Create new admin/teacher account |
| PATCH | /api/admin/users/[id] | Change user role (promote/demote) |
| DELETE | /api/admin/users/[id] | Delete user account |

### Classes (Admin)
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/classes | List all classes with enrollment counts |
| POST | /api/classes | Create class (auto-generates join code) |
| GET | /api/classes/[id] | Get class details |
| PUT | /api/classes/[id] | Update class |
| DELETE | /api/classes/[id] | Delete class |
| GET | /api/classes/[id]/students | List enrolled students with attendance stats |

### Enrollments
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/enrollments | Student joins class via `{ classCode }` |
| PATCH | /api/enrollments/[id] | Admin approves/rejects enrollment |
| DELETE | /api/enrollments/[id] | Remove enrollment |
| GET | /api/enrollments/pending | List pending enrollments (admin) |

### Sessions (Admin)
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/sessions | List all sessions |
| POST | /api/sessions | Start new session for a class |
| GET | /api/sessions/[id] | Get session details |
| DELETE | /api/sessions/[id] | End session |
| GET | /api/sessions/[id]/qr | Get/refresh QR token |
| GET | /api/sessions/[id]/checkins | List check-ins for session |

### Attendance
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/attendance/check-in | Student scans QR to check in |
| GET | /api/attendance/records | Filtered attendance records (admin) |
| GET | /api/attendance/export | Export records as CSV (admin) |
| POST | /api/attendance/manual | Admin manually checks in a student |

### Student
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/student/classes | Get enrolled classes |
| GET | /api/student/history/[classId] | Attendance history for a class |
| GET | /api/student/stats | Overall attendance stats |

### Settings
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/settings | Get current settings |
| PUT | /api/settings | Update settings (admin) |

## QR Attendance Flow

1. **Admin** creates a class → system generates a unique join code (e.g., `COMP-15LS`)
2. **Admin** shares the class code with students
3. **Students** register, then join the class using the code
4. **Admin** starts an attendance session for a class
5. System generates a QR code containing `{ token, sessionId, expiresAt }`
6. QR token **auto-refreshes every 30 seconds** to prevent screenshot sharing
7. **Student** opens the scan page → points camera at QR code
8. System validates: token matches, not expired, student enrolled, not already checked in
9. System determines status: **present** (within threshold) or **late** (past threshold)
10. **Admin** sees check-ins appear in the live feed in real-time
11. **Admin** can end the session, export records, or manually check in students

## Admin Management

Admins/teachers can be added in three ways:
1. **Create directly** — From Settings page, click "Create Admin" to create a new admin account with name, email, and password
2. **Promote student** — From Settings page, click "Find Student" to search and promote an existing student to admin role
3. **Demote admin** — Admins can be demoted back to student role (you cannot demote yourself)

Safety checks:
- Cannot demote or delete your own account
- Email uniqueness enforced when creating new admins

## Anti-Cheating Measures

- QR tokens expire every 30 seconds (configurable)
- Old tokens are invalidated when a new one is generated
- One check-in per student per session (database constraint)
- Students must be enrolled in the class to check in
- Server-side validation of all token data

## Authentication

- JWT tokens stored in httpOnly cookies (7-day expiry)
- Passwords hashed with bcrypt (10 rounds)
- Route protection via Next.js proxy (middleware)
- Role-based access: admin routes return 403 for students

## Default Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@attendance.com | admin123 |

## Running the App

### Development (Local SQLite)
```bash
cd qr-attendance
npm install
npx prisma generate
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev
```
Access at http://localhost:3000

### Production (Turso + Docker)
```bash
cd qr-attendance
docker build -t qr-attendance \
  --build-arg TURSO_DATABASE_URL="libsql://your-db.turso.io" \
  --build-arg TURSO_AUTH_TOKEN="your-token" \
  --build-arg JWT_SECRET="your-secret" .

docker run -p 8080:8080 \
  -e TURSO_DATABASE_URL="libsql://your-db.turso.io" \
  -e TURSO_AUTH_TOKEN="your-token" \
  -e JWT_SECRET="your-secret" \
  qr-attendance
```

### Deploy to Google Cloud Run
1. Push code to GitHub
2. In Cloud Run console → Create Service → Connect GitHub repo
3. Set build type: Dockerfile
4. Set port: 8080
5. Add environment variables:
   - `TURSO_DATABASE_URL` — your Turso database URL
   - `TURSO_AUTH_TOKEN` — your Turso auth token
   - `JWT_SECRET` — a random secret string
6. Deploy

### Turso Database Setup
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso auth signup
turso db create qr-attendance

# Get credentials
turso db show qr-attendance --url
turso db tokens create qr-attendance

# Push schema (from project directory)
node scripts/seed-turso.js
```

### Mobile Access (same Wi-Fi network)
1. Find your PC's local IP: check the `Network:` line when the server starts
2. Open firewall (run as admin):
   ```powershell
   netsh advfirewall firewall add rule name="Next.js Dev" dir=in action=allow protocol=TCP localport=3000
   ```
3. Access from phone: `http://<your-pc-ip>:3000`
4. Install as PWA: Browser menu → "Add to Home Screen"

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| TURSO_DATABASE_URL | Turso database URL (`libsql://...`) or local SQLite path (`file:./prisma/dev.db`) | Yes |
| TURSO_AUTH_TOKEN | Turso auth token (only needed for remote Turso) | Production |
| JWT_SECRET | Secret for signing JWT tokens | Yes |

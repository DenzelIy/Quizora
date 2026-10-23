# Quizora - Offline Multiplayer Quiz Game

An offline multiplayer quiz game inspired by Kahoot. Run quizzes on your local network with no internet connection required. A host creates and starts a quiz on their computer, and students join from their phones, tablets, or computers using a browser.

## Features

- **Fully offline** - works without internet after installation
- **Multiplayer** - 20-100 players on a local network
- **Real-time** - synchronized questions, timers, and leaderboards via Socket.IO
- **Server-authoritative** - scores calculated server-side, no cheating
- **Quiz editor** - create, edit, duplicate, and manage quizzes
- **Multiple question types** - multiple choice and true/false
- **Speed scoring** - faster correct answers earn more points
- **Leaderboard** - live rankings with podium display
- **Game history** - results saved to SQLite, CSV export available
- **Mobile-friendly** - responsive design for all screen sizes

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Socket.IO Client, Lucide React
- **Backend**: Node.js, Express, TypeScript, Socket.IO, SQLite (better-sqlite3)
- **Database**: SQLite (local file, no server needed)

## Quick Start

### Prerequisites

- Node.js 18+ (recommended: Node.js 20 or 22)
- npm 9+

### Installation

```bash
git clone <repo-url> quizora
cd quizora
npm install
npm run db:seed
npm run build -w frontend
```

### Development

```bash
npm run dev
```

This starts:
- Backend on http://localhost:3001
- Frontend on http://localhost:5173 (with proxy to backend)

### Production

```bash
npm run build -w frontend
npm start
```

The server will display your LAN IP address. Students connect to `http://<your-ip>:3001` from their browsers.

## How to Play

### For the Host (Teacher)

1. Start the server on your computer
2. Open `http://localhost:3001` in your browser
3. Create a quiz or select an existing one
4. Click "Host Game" on a quiz
5. Share the game PIN and join URL with students
6. Wait for students to join, then click "Start Game"
7. Advance through questions and view results

### For Students

1. Connect to the same Wi-Fi network or hotspot as the host
2. Open the join URL in a browser (e.g., `http://192.168.1.10:3001/join`)
3. Enter the game PIN displayed on the host's screen
4. Enter a display name
5. Answer questions as they appear
6. View your score and ranking on the leaderboard

## Network Setup

### Requirements

- Host and students must be on the **same Wi-Fi network or hotspot**
- The host's firewall must allow connections on port 3001

### Hotspot Mode

You can use a phone or the host computer as a hotspot:
1. Enable hotspot on any device
2. Connect the host computer and student devices to it
3. No internet is needed - the hotspot just creates a local network

## Project Structure

```
quizora/
  backend/
    src/
      db/           # Database schema, init, seed
      middleware/    # Error handling, rate limiting
      routes/       # REST API routes
      services/     # Quiz, session, scoring logic
      socket/       # Socket.IO game engine
      utils/        # Network utilities
  frontend/
    src/
      components/   # Reusable UI components
      context/      # React context for game state
      hooks/        # Custom hooks
      pages/        # Page components
      services/     # API and socket clients
  shared/
    src/            # Shared TypeScript types and validation
  electron/         # Electron main process and preload
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev servers (backend + frontend) |
| `npm run build -w frontend` | Build frontend for production |
| `npm start` | Start production server |
| `npm run db:seed` | Seed sample quizzes |

## Scoring Formula

When speed scoring is enabled:

```
points = round(questionPoints * (0.5 + 0.5 * remainingTime / totalTime))
```

- Correct answers earn 50-100% of question points based on speed
- Incorrect or unanswered questions earn 0 points

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `DB_PATH` | `backend/data/quizspark.db` | Database file path |

## License

ISC

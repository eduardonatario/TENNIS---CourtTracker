import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// Data store file
const DATA_FILE = path.join(__dirname, 'sessions_data.json');

interface StrokeSample {
  id: string;
  timestamp: string;
  category: 'Forehand' | 'Backhand' | 'Serve' | 'Volley' | 'Smash' | 'Normal Movement';
  accelX: number;
  accelY: number;
  accelZ: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  magnitude: number;
  rotationMagnitude: number;
  peakForceG: number;
  ballSpeedKmh: number;
  spinRpm: number;
}

interface TennisSession {
  id: string;
  title: string;
  date: string;
  durationSeconds: number;
  totalSamples: number;
  totalMotions: number;
  samplingFrequencyHz: number;
  watchModel: string;
  batteryLevel: number;
  rssi: number;
  strokesSummary: {
    Forehand: number;
    Backhand: number;
    Serve: number;
    Volley: number;
    Smash: number;
    'Normal Movement': number;
  };
  samples: StrokeSample[];
}

// Default initial mock sessions
const defaultSessions: TennisSession[] = [
  {
    id: 'session-1',
    title: 'Match Practice - Hard Court (Set 1 & 2)',
    date: new Date(Date.now() - 3600000 * 2).toISOString(),
    durationSeconds: 2740,
    totalSamples: 14200,
    totalMotions: 342,
    samplingFrequencyHz: 100,
    watchModel: 'Apple Watch Ultra 2 (watchOS 11)',
    batteryLevel: 86,
    rssi: -58,
    strokesSummary: {
      Forehand: 142,
      Backhand: 98,
      Serve: 45,
      Volley: 32,
      Smash: 12,
      'Normal Movement': 13,
    },
    samples: generateMockSamples(50)
  },
  {
    id: 'session-2',
    title: 'Serve & Volley Drill Session',
    date: new Date(Date.now() - 3600000 * 24).toISOString(),
    durationSeconds: 1800,
    totalSamples: 9600,
    totalMotions: 215,
    samplingFrequencyHz: 100,
    watchModel: 'Apple Watch Series 10',
    batteryLevel: 92,
    rssi: -52,
    strokesSummary: {
      Forehand: 30,
      Backhand: 15,
      Serve: 110,
      Volley: 50,
      Smash: 8,
      'Normal Movement': 2,
    },
    samples: generateMockSamples(40)
  },
  {
    id: 'session-3',
    title: 'Baseline Rally Endurance',
    date: new Date(Date.now() - 3600000 * 48).toISOString(),
    durationSeconds: 3600,
    totalSamples: 18000,
    totalMotions: 480,
    samplingFrequencyHz: 100,
    watchModel: 'Apple Watch Ultra 2',
    batteryLevel: 64,
    rssi: -65,
    strokesSummary: {
      Forehand: 260,
      Backhand: 190,
      Serve: 0,
      Volley: 5,
      Smash: 5,
      'Normal Movement': 20,
    },
    samples: generateMockSamples(45)
  }
];

function generateMockSamples(count: number): StrokeSample[] {
  const categories: ('Forehand' | 'Backhand' | 'Serve' | 'Volley' | 'Smash' | 'Normal Movement')[] = [
    'Forehand', 'Backhand', 'Serve', 'Volley', 'Smash', 'Normal Movement'
  ];
  const samples: StrokeSample[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const isImpact = cat !== 'Normal Movement';
    samples.push({
      id: `sample-${i + 1}`,
      timestamp: new Date(now - (count - i) * 30000).toISOString(),
      category: cat,
      accelX: Number((Math.random() * (isImpact ? 12 : 3) - (isImpact ? 6 : 1.5)).toFixed(2)),
      accelY: Number((Math.random() * (isImpact ? 15 : 3) - (isImpact ? 7.5 : 1.5)).toFixed(2)),
      accelZ: Number((Math.random() * (isImpact ? 10 : 2) - 5).toFixed(2)),
      gyroX: Number((Math.random() * (isImpact ? 8 : 2) - 4).toFixed(2)),
      gyroY: Number((Math.random() * (isImpact ? 10 : 2) - 5).toFixed(2)),
      gyroZ: Number((Math.random() * (isImpact ? 6 : 1.5) - 3).toFixed(2)),
      magnitude: Number((Math.random() * (isImpact ? 18 : 2) + (isImpact ? 5 : 1)).toFixed(2)),
      rotationMagnitude: Number((Math.random() * (isImpact ? 12 : 1.5) + (isImpact ? 3 : 0.5)).toFixed(2)),
      peakForceG: isImpact ? Number((Math.random() * 8 + 4.5).toFixed(1)) : Number((Math.random() * 1.5 + 0.8).toFixed(1)),
      ballSpeedKmh: cat === 'Serve' ? Math.floor(Math.random() * 35 + 145) : (isImpact ? Math.floor(Math.random() * 45 + 90) : 0),
      spinRpm: cat === 'Forehand' ? Math.floor(Math.random() * 1200 + 2800) : (cat === 'Serve' ? Math.floor(Math.random() * 800 + 1500) : Math.floor(Math.random() * 1000 + 1200))
    });
  }
  return samples;
}

// Load or initialize DB
function getSessions(): TennisSession[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading data file:', e);
  }
  saveSessions(defaultSessions);
  return defaultSessions;
}

function saveSessions(sessions: TennisSession[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(sessions, null, 2));
  } catch (e) {
    console.error('Error saving data file:', e);
  }
}

// API Routes
app.get('/api/sessions', (req, res) => {
  const sessions = getSessions();
  res.json(sessions);
});

app.post('/api/sessions', (req, res) => {
  try {
    const newSession: TennisSession = req.body;
    if (!newSession.id || !newSession.title) {
      return res.status(400).json({ error: 'Invalid session data' });
    }
    const sessions = getSessions();
    sessions.unshift(newSession);
    saveSessions(sessions);
    res.status(201).json(newSession);
  } catch (e) {
    res.status(500).json({ error: 'Failed to save session' });
  }
});

app.delete('/api/sessions/:id', (req, res) => {
  const { id } = req.params;
  let sessions = getSessions();
  const initialLength = sessions.length;
  sessions = sessions.filter(s => s.id !== id);
  if (sessions.length === initialLength) {
    return res.status(404).json({ error: 'Session not found' });
  }
  saveSessions(sessions);
  res.json({ success: true, id });
});

let watchStatusState = {
  connected: true,
  model: 'Apple Watch Ultra 2',
  watchOS: '11.2',
  batteryLevel: 88,
  rssi: -54,
  samplingRateHz: 100,
  firmware: '2.4.1-PRO',
  syncStatus: 'Synced 1 min ago'
};

app.get('/api/watch-status', (req, res) => {
  res.json(watchStatusState);
});

app.post('/api/watch-status', (req, res) => {
  watchStatusState = { ...watchStatusState, ...req.body };
  res.json(watchStatusState);
});

// Vite middleware integration in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true }
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`CourtTracker Server running on http://localhost:${PORT}`);
  });
}

startServer();

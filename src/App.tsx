import React, { useState, useEffect } from 'react';
import {
  Activity,
  Watch,
  Play,
  Square,
  RefreshCw,
  Download,
  Trash2,
  Calendar,
  Clock,
  Zap,
  Radio,
  FileText,
  Code2,
  CheckCircle2,
  Smartphone,
  BarChart3,
  Cpu,
  Shield,
  Layers,
  ChevronRight,
  ArrowLeft,
  SmartphoneNfc,
  RadioTower,
  X
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';

interface StrokeSample {
  id: string;
  timestamp: string;
  category: 'Forehand' | 'Backhand' | 'Saque' | 'Normal Movement';
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
    Saque: number;
    'Normal Movement': number;
  };
  samples: StrokeSample[];
}

interface TrainingCapture {
  id: string;
  strokeType: 'Forehand' | 'Backhand' | 'Saque';
  attemptNumber: number;
  timestamp: string;
  durationSeconds: number;
  samplesCount: number;
  peakForce: number;
  status: 'Synced' | 'Pending Sync';
}

const STROKE_COLORS = {
  Forehand: '#16a34a',
  Backhand: '#2563eb',
  Saque: '#ea580c',
  'Normal Movement': '#4b5563'
};

const STROKE_THEMES = {
  Forehand: {
    bg: 'bg-emerald-600',
    hover: 'hover:bg-emerald-500',
    text: 'text-emerald-400',
    border: 'border-emerald-500/50',
    badge: 'bg-emerald-500/20 text-emerald-300'
  },
  Backhand: {
    bg: 'bg-blue-600',
    hover: 'hover:bg-blue-500',
    text: 'text-blue-400',
    border: 'border-blue-500/50',
    badge: 'bg-blue-500/20 text-blue-300'
  },
  Saque: {
    bg: 'bg-orange-600',
    hover: 'hover:bg-orange-500',
    text: 'text-orange-400',
    border: 'border-orange-500/50',
    badge: 'bg-orange-500/20 text-orange-300'
  }
};

function StrokeIcon({ strokeType, size = 36 }: { strokeType: 'Forehand' | 'Backhand' | 'Saque'; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '9999px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        backgroundColor: '#000',
        flexShrink: 0,
        position: 'relative'
      }}
    >
      <img
        src="/public/assets/aistudio/tennis-icone5_772cd9ff.png"
        alt={strokeType}
        style={{
          width: '300%',
          height: '100%',
          maxWidth: 'none',
          position: 'absolute',
          top: 0,
          left: strokeType === 'Saque' ? '0%' : strokeType === 'Forehand' ? '-100%' : '-200%',
          objectFit: 'cover'
        }}
      />
    </div>
  );
}

function MenuImageIcon({ type, size = 48 }: { type: 'tennis-ball' | 'stats'; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #cbd5e1',
        backgroundColor: '#000',
        flexShrink: 0,
        position: 'relative'
      }}
    >
      <img
        src="/public/assets/aistudio/detectar_e_coletar_dados_ba0d4a09.png"
        alt={type}
        style={{
          width: '200%',
          height: '100%',
          maxWidth: 'none',
          position: 'absolute',
          top: 0,
          left: type === 'tennis-ball' ? '0%' : '-100%',
          objectFit: 'cover'
        }}
      />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simulator' | 'history' | 'integration'>('simulator');
  const [sessions, setSessions] = useState<TennisSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [watchStatus] = useState({
    connected: true,
    model: 'Apple Watch Ultra 2',
    watchOS: '11.2',
    batteryLevel: 88,
    rssi: -54
  });

  const [strokeCounts, setStrokeCounts] = useState({
    Forehand: 17,
    Backhand: 12,
    Saque: 15
  });

  const [detectedCounts, setDetectedCounts] = useState({
    Forehand: 5,
    Backhand: 3,
    Saque: 4
  });

  const [matchTimer, setMatchTimer] = useState(0);

  const [watchScreen, setWatchScreen] = useState<'splash' | 'main-menu' | 'strokes-menu' | 'collecting' | 'playing'>('splash');
  const [activeStrokeType, setActiveStrokeType] = useState<'Forehand' | 'Backhand' | 'Saque' | null>(null);
  const [collectionTimer, setCollectionTimer] = useState(0);
  const [trainingCaptures, setTrainingCaptures] = useState<TrainingCapture[]>([
    { id: 'cap-1', strokeType: 'Forehand', attemptNumber: 17, timestamp: new Date(Date.now() - 600000).toISOString(), durationSeconds: 4, samplesCount: 400, peakForce: 7.2, status: 'Synced' },
    { id: 'cap-2', strokeType: 'Saque', attemptNumber: 15, timestamp: new Date(Date.now() - 1200000).toISOString(), durationSeconds: 5, samplesCount: 500, peakForce: 8.9, status: 'Synced' },
    { id: 'cap-3', strokeType: 'Backhand', attemptNumber: 12, timestamp: new Date(Date.now() - 1800000).toISOString(), durationSeconds: 4, samplesCount: 380, peakForce: 6.5, status: 'Synced' }
  ]);

  const [isLiveRecording, setIsLiveRecording] = useState(false);
  const [liveDuration, setLiveDuration] = useState(0);
  const [liveSamples, setLiveSamples] = useState<StrokeSample[]>([]);
  const [liveStrokesCount, setLiveStrokesCount] = useState({
    Forehand: 0,
    Backhand: 0,
    Saque: 0,
    'Normal Movement': 0
  });

  useEffect(() => {
    let detectionInterval: any;
    let matchInterval: any;
    if (watchScreen === 'playing') {
      setMatchTimer(0);
      matchInterval = setInterval(() => {
        setMatchTimer(prev => prev + 1);
      }, 1000);

      detectionInterval = setInterval(() => {
        const strokes: ('Forehand' | 'Backhand' | 'Saque')[] = ['Forehand', 'Backhand', 'Saque'];
        const randomStroke = strokes[Math.floor(Math.random() * strokes.length)];
        setDetectedCounts(prev => ({
          ...prev,
          [randomStroke]: prev[randomStroke] + 1
        }));
      }, 3000);
    }
    return () => {
      clearInterval(detectionInterval);
      clearInterval(matchInterval);
    };
  }, [watchScreen]);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data);
      if (data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    }
  };

  useEffect(() => {
    let timer: any;
    if (watchScreen === 'collecting') {
      timer = setInterval(() => {
        setCollectionTimer(prev => prev + 1);
      }, 1000);
    } else {
      setCollectionTimer(0);
    }
    return () => clearInterval(timer);
  }, [watchScreen]);

  const startCollection = (type: 'Forehand' | 'Backhand' | 'Saque') => {
    setActiveStrokeType(type);
    setCollectionTimer(0);
    setWatchScreen('collecting');
  };

  const finishCollection = () => {
    if (!activeStrokeType) return;
    const newAttemptNum = strokeCounts[activeStrokeType] + 1;
    setStrokeCounts(prev => ({
      ...prev,
      [activeStrokeType]: newAttemptNum
    }));

    const newCapture: TrainingCapture = {
      id: `cap-${Date.now()}`,
      strokeType: activeStrokeType,
      attemptNumber: newAttemptNum,
      timestamp: new Date().toISOString(),
      durationSeconds: collectionTimer || 4,
      samplesCount: (collectionTimer || 4) * 100,
      peakForce: Number((Math.random() * 4 + 5.5).toFixed(1)),
      status: 'Synced'
    };

    setTrainingCaptures([newCapture, ...trainingCaptures]);
    setWatchScreen('strokes-menu');
    setActiveStrokeType(null);
  };

  useEffect(() => {
    let timer: any;
    let generator: any;

    if (isLiveRecording) {
      timer = setInterval(() => {
        setLiveDuration(prev => prev + 1);
      }, 1000);

      generator = setInterval(() => {
        const categories: ('Forehand' | 'Backhand' | 'Saque' | 'Normal Movement')[] = [
          'Forehand', 'Backhand', 'Saque', 'Normal Movement', 'Normal Movement'
        ];
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const isImpact = cat !== 'Normal Movement';

        const newSample: StrokeSample = {
          id: `live-${Date.now()}`,
          timestamp: new Date().toISOString(),
          category: cat,
          accelX: Number((Math.random() * (isImpact ? 14 : 3) - (isImpact ? 7 : 1.5)).toFixed(2)),
          accelY: Number((Math.random() * (isImpact ? 16 : 3) - (isImpact ? 8 : 1.5)).toFixed(2)),
          accelZ: Number((Math.random() * (isImpact ? 11 : 2) - 5.5).toFixed(2)),
          gyroX: Number((Math.random() * (isImpact ? 9 : 2) - 4.5).toFixed(2)),
          gyroY: Number((Math.random() * (isImpact ? 11 : 2) - 5.5).toFixed(2)),
          gyroZ: Number((Math.random() * (isImpact ? 7 : 1.5) - 3.5).toFixed(2)),
          magnitude: Number((Math.random() * (isImpact ? 20 : 2) + (isImpact ? 6 : 1)).toFixed(2)),
          rotationMagnitude: Number((Math.random() * (isImpact ? 14 : 1.5) + (isImpact ? 4 : 0.5)).toFixed(2)),
          peakForceG: isImpact ? Number((Math.random() * 7 + 4.8).toFixed(1)) : Number((Math.random() * 1.5 + 0.9).toFixed(1)),
          ballSpeedKmh: cat === 'Saque' ? Math.floor(Math.random() * 30 + 150) : (isImpact ? Math.floor(Math.random() * 40 + 95) : 0),
          spinRpm: cat === 'Forehand' ? Math.floor(Math.random() * 1000 + 3000) : (cat === 'Saque' ? Math.floor(Math.random() * 600 + 1800) : Math.floor(Math.random() * 800 + 1400))
        };

        setLiveStrokesCount(prev => ({
          ...prev,
          [cat]: prev[cat] + 1
        }));

        setLiveSamples(prev => [...prev.slice(-30), newSample]);
      }, 800);
    }

    return () => {
      clearInterval(timer);
      clearInterval(generator);
    };
  }, [isLiveRecording]);

  const toggleLiveRecording = () => {
    if (!isLiveRecording) {
      setLiveSamples([]);
      setLiveDuration(0);
      setLiveStrokesCount({
        Forehand: 0,
        Backhand: 0,
        Saque: 0,
        'Normal Movement': 0
      });
      setIsLiveRecording(true);
    } else {
      setIsLiveRecording(false);
      if (liveSamples.length > 5) {
        const newSession: TennisSession = {
          id: `session-live-${Date.now()}`,
          title: `Sessão Ao Vivo (${new Date().toLocaleTimeString()})`,
          date: new Date().toISOString(),
          durationSeconds: liveDuration,
          totalSamples: liveSamples.length * 15,
          totalMotions: Object.values(liveStrokesCount).reduce((a, b) => a + b, 0) - liveStrokesCount['Normal Movement'],
          samplingFrequencyHz: 100,
          watchModel: watchStatus.model,
          batteryLevel: watchStatus.batteryLevel,
          rssi: -54,
          strokesSummary: liveStrokesCount,
          samples: liveSamples
        };

        fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSession)
        })
          .then(res => res.json())
          .then(() => fetchSessions());
      }
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (selectedSessionId === id) {
        const remaining = sessions.filter(s => s.id !== id);
        setSelectedSessionId(remaining[0]?.id || '');
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  };

  const currentSession = sessions.find(s => s.id === selectedSessionId) || sessions[0];

  const chartData = isLiveRecording
    ? liveSamples.map((s, idx) => ({
        index: idx + 1,
        time: new Date(s.timestamp).toLocaleTimeString(),
        accelX: s.accelX,
        accelY: s.accelY,
        accelZ: s.accelZ,
        magnitude: s.magnitude,
        category: s.category
      }))
    : (currentSession?.samples || []).map((s, idx) => ({
        index: idx + 1,
        time: `#${idx + 1}`,
        accelX: s.accelX,
        accelY: s.accelY,
        accelZ: s.accelZ,
        magnitude: s.magnitude,
        category: s.category
      }));

  const strokesSummaryData = isLiveRecording
    ? Object.entries(liveStrokesCount).map(([name, value]) => ({ name, value }))
    : currentSession
    ? Object.entries(currentSession.strokesSummary).map(([name, value]) => ({ name, value }))
    : [];

  const totalMotionsCount = isLiveRecording
    ? Object.values(liveStrokesCount).reduce((a, b) => a + b, 0)
    : currentSession
    ? Object.values(currentSession.strokesSummary).reduce((a, b) => a + b, 0)
    : 0;

  const exportData = (format: 'csv' | 'json') => {
    if (!currentSession && !isLiveRecording) return;
    const dataToExport = isLiveRecording
      ? { title: 'Live Session', duration: liveDuration, samples: liveSamples, strokes: liveStrokesCount }
      : currentSession;

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'json') {
      content = JSON.stringify(dataToExport, null, 2);
      filename = `courttracker-export-${Date.now()}.json`;
      mimeType = 'application/json';
    } else {
      const samples = isLiveRecording ? liveSamples : currentSession.samples;
      const headers = ['id', 'timestamp', 'category', 'accelX', 'accelY', 'accelZ', 'magnitude', 'peakForceG', 'ballSpeedKmh'];
      const rows = samples.map(s => [
        s.id,
        s.timestamp,
        s.category,
        s.accelX,
        s.accelY,
        s.accelZ,
        s.magnitude,
        s.peakForceG,
        s.ballSpeedKmh
      ]);
      content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      filename = `courttracker-export-${Date.now()}.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')}`;
  };

  const activeTheme = activeStrokeType ? STROKE_THEMES[activeStrokeType] : STROKE_THEMES.Forehand;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <img
                src="/public/assets/aistudio/tennis-icone3-saque_b6af230a.png"
                alt="App Icon"
                className="w-11 h-11 rounded-xl object-cover border border-zinc-300 shadow-sm"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-wider text-slate-900">COURT<span className="text-emerald-600">TRACKER</span></span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">watchOS & iOS</span>
              </div>
              <p className="text-xs text-slate-500">Tennis Motion Analytics</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1.5 bg-slate-200/70 p-1.5 rounded-xl border border-zinc-200">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'simulator'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Watch className="w-4 h-4" />
              <span>Simulador</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'dashboard'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Histórico</span>
            </button>
            <button
              onClick={() => setActiveTab('integration')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'integration'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Xcode Guide</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ========================================================= */}
        {/* TAB 1: WATCH & IPHONE SIMULATOR */}
        {/* ========================================================= */}
        {activeTab === 'simulator' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-center">
              
              {/* Apple Watch Simulator */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="text-xs font-bold text-slate-500 mb-3 flex items-center space-x-2">
                  <Watch className="w-4 h-4 text-emerald-600" />
                  <span>APPLE WATCH</span>
                </div>

                <div className="w-[340px] h-[410px] bg-black rounded-[48px] border-[6px] border-zinc-800 shadow-2xl p-5 flex flex-col justify-between relative overflow-hidden text-white no-scrollbar">
                  <div className="absolute right-[-10px] top-24 w-2 h-12 bg-zinc-700 rounded-r-md"></div>
                  <div className="absolute right-[-10px] top-12 w-2 h-8 bg-zinc-800 rounded-r-md"></div>

                  {/* WATCH SCREEN 1: SPLASH */}
                  {watchScreen === 'splash' && (
                    <div className="flex flex-col h-full justify-between items-center text-center py-6">
                      <div className="my-auto flex flex-col items-center justify-center">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-[#a3e635] shadow-xl shadow-[#a3e635]/20 bg-black flex items-center justify-center">
                          <img
                            src="/public/assets/aistudio/tennis-icone3-saque_b6af230a.png"
                            alt="Tennis Saque Icon"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => setWatchScreen('main-menu')}
                        className="w-full py-4 bg-[#a3e635] hover:bg-[#8cc62d] text-slate-950 rounded-full font-black text-base uppercase tracking-wider shadow-lg shadow-[#a3e635]/30 transition-all active:scale-95"
                      >
                        INICIAR
                      </button>
                    </div>
                  )}

                  {/* WATCH SCREEN 2: MAIN MENU */}
                  {watchScreen === 'main-menu' && (
                    <div className="flex flex-col h-full justify-between py-2">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                        <button
                          onClick={() => setWatchScreen('splash')}
                          className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md transition-all"
                          title="Fechar"
                        >
                          <X className="w-4 h-4 stroke-[3]" />
                        </button>
                        <span className="text-xs font-mono font-bold text-zinc-300">11:47</span>
                      </div>

                      <div className="flex-1 flex flex-col justify-center space-y-4 py-2">
                        <button
                          onClick={() => setWatchScreen('strokes-menu')}
                          className="w-full h-24 bg-white hover:bg-zinc-100 text-slate-950 rounded-3xl p-4 flex items-center space-x-4 text-left transition-all active:scale-95 shadow-md"
                        >
                          <MenuImageIcon type="stats" size={48} />
                          <div>
                            <div className="text-base font-black text-slate-950 uppercase tracking-tight">COLETAR DADOS</div>
                            <div className="text-[10px] text-slate-600 font-semibold uppercase mt-0.5">Treinamento ML</div>
                          </div>
                        </button>

                        <button
                          onClick={() => setWatchScreen('playing')}
                          className="w-full h-24 bg-white hover:bg-zinc-100 text-slate-950 rounded-3xl p-4 flex items-center space-x-4 text-left transition-all active:scale-95 shadow-md"
                        >
                          <MenuImageIcon type="tennis-ball" size={48} />
                          <div>
                            <div className="text-base font-black text-slate-950 uppercase tracking-tight">JOGAR E DETECTAR</div>
                            <div className="text-[10px] text-slate-600 font-semibold uppercase mt-0.5">Partida ao vivo</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* WATCH SCREEN 3: STROKES MENU */}
                  {watchScreen === 'strokes-menu' && (
                    <div className="flex flex-col h-full justify-between no-scrollbar overflow-hidden">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                        <button
                          onClick={() => setWatchScreen('main-menu')}
                          className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md transition-all"
                          title="Fechar"
                        >
                          <X className="w-4 h-4 stroke-[3]" />
                        </button>
                        <span className="text-xs font-mono font-bold text-zinc-300">11:47</span>
                      </div>

                      <div className="py-2 text-center">
                        <div className="text-sm font-black text-white uppercase tracking-wider">QUAL MOVIMENTO COLETAR?</div>
                      </div>

                      <div className="flex-1 flex flex-col justify-center space-y-3 no-scrollbar overflow-hidden py-1">
                        {[
                          { key: 'Forehand', label: 'FOREHAND', count: strokeCounts.Forehand, bg: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
                          { key: 'Backhand', label: 'BACKHAND', count: strokeCounts.Backhand, bg: 'bg-blue-600 hover:bg-blue-500 text-white' },
                          { key: 'Saque', label: 'SAQUE', count: strokeCounts.Saque, bg: 'bg-orange-600 hover:bg-orange-500 text-white' },
                        ].map(item => (
                          <button
                            key={item.key}
                            onClick={() => startCollection(item.key as any)}
                            className={`w-full px-5 py-4 rounded-full flex items-center justify-between shadow-lg transition-all active:scale-95 ${item.bg}`}
                          >
                            <span className="text-xl font-black tracking-tight">{item.label}</span>
                            <span className="text-2xl font-mono font-black">{item.count}</span>
                          </button>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-zinc-800 text-center text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                        Selecione e repita o movimento
                      </div>
                    </div>
                  )}

                  {/* WATCH SCREEN 4: ACTIVE COLLECTION */}
                  {watchScreen === 'collecting' && (
                    <div className="flex flex-col h-full justify-between items-center text-center py-2 no-scrollbar overflow-hidden">
                      <div className="w-full flex items-center justify-between">
                        <button
                          onClick={() => setWatchScreen('strokes-menu')}
                          className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md transition-all"
                          title="Fechar"
                        >
                          <X className="w-4 h-4 stroke-[3]" />
                        </button>
                        <span className={`text-xs font-mono font-black uppercase tracking-wider animate-pulse ${activeTheme.text}`}>● GRAVANDO</span>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">GOLPE ATIVO</div>
                        <div className={`text-3xl font-black uppercase tracking-wide ${activeTheme.text}`}>{activeStrokeType}</div>
                        <div className="text-5xl font-mono font-black text-white mt-1">
                          00:0{collectionTimer}s
                        </div>
                      </div>

                      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 my-2 space-y-2">
                        <div className="flex items-center justify-between text-xs text-zinc-400 font-mono uppercase tracking-wider">
                          <span>COREMOTION</span>
                          <span className={`font-bold ${activeTheme.text}`}>COLETANDO</span>
                        </div>
                        <div className="flex items-center justify-center space-x-1.5 h-10">
                          {[50, 80, 35, 100, 65, 90, 40, 95, 60, 85].map((h, i) => (
                            <span
                              key={i}
                              className={`w-2 rounded-full animate-pulse ${activeStrokeType === 'Forehand' ? 'bg-emerald-500' : activeStrokeType === 'Backhand' ? 'bg-blue-500' : 'bg-orange-500'}`}
                              style={{ height: `${Math.floor(Math.random() * 28 + 10)}px`, animationDelay: `${i * 90}ms` }}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={finishCollection}
                        className={`w-full py-4 rounded-full font-black text-base uppercase tracking-wider shadow-lg transition-all active:scale-95 text-white ${activeTheme.bg} ${activeTheme.hover}`}
                      >
                        CONCLUIR
                      </button>
                    </div>
                  )}

                  {/* WATCH SCREEN 5: PLAYING LIVE DETECTION (TEMPO DE PARTIDA: timer) */}
                  {watchScreen === 'playing' && (
                    <div className="flex flex-col h-full justify-between py-1 no-scrollbar overflow-hidden">
                      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                        <button
                          onClick={() => setWatchScreen('main-menu')}
                          className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md transition-all"
                          title="Fechar"
                        >
                          <X className="w-4 h-4 stroke-[3]" />
                        </button>
                        <span className="text-[10px] text-emerald-400 font-mono font-black animate-pulse">● DETECTANDO</span>
                      </div>

                      {/* TEMPO DE PARTIDA: timer */}
                      <div className="pt-2 text-center flex items-center justify-center space-x-2">
                        <span className="text-base font-black text-white uppercase tracking-tight">TEMPO DE PARTIDA:</span>
                        <span className="text-base font-black text-white">{formatDuration(matchTimer)}</span>
                      </div>

                      <div className="flex-1 flex flex-col justify-center space-y-3 py-1 no-scrollbar">
                        {[
                          { key: 'Forehand', label: 'FOREHAND', count: detectedCounts.Forehand, bg: 'bg-emerald-600 text-white' },
                          { key: 'Backhand', label: 'BACKHAND', count: detectedCounts.Backhand, bg: 'bg-blue-600 text-white' },
                          { key: 'Saque', label: 'SAQUE', count: detectedCounts.Saque, bg: 'bg-orange-600 text-white' },
                        ].map(item => (
                          <div
                            key={item.key}
                            className={`w-full px-5 py-4 rounded-full flex items-center justify-between shadow-md ${item.bg}`}
                          >
                            <span className="text-xl font-black tracking-tight">{item.label}</span>
                            <span className="text-2xl font-mono font-black">{item.count}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => setWatchScreen('main-menu')}
                        className="w-full py-3 rounded-full font-black text-xs uppercase tracking-wider shadow-lg animate-[pulse_3s_infinite] bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-600"
                      >
                        FINALIZAR PARTIDA
                      </button>
                    </div>
                  )}

                </div>
              </div>

              {/* iPhone Companion App Simulator */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="text-xs font-bold text-slate-500 mb-3 flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>APP DO IPHONE (CONCENTRADOR)</span>
                </div>

                <div className="w-[380px] h-[720px] bg-white rounded-[44px] border-[8px] border-slate-800 shadow-2xl p-5 flex flex-col justify-between relative overflow-hidden no-scrollbar">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-slate-900 mr-2"></div>
                    <div className="w-12 h-1 bg-slate-900 rounded-full"></div>
                  </div>

                  <div className="pt-6 pb-3 border-b border-zinc-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <img
                        src="/public/assets/aistudio/tennis-icone3-saque_b6af230a.png"
                        alt="iPhone App Icon"
                        className="w-9 h-9 rounded-xl object-cover border border-zinc-300 shadow-xs"
                      />
                      <div>
                        <h3 className="text-base font-black text-slate-900">CourtTracker</h3>
                        <p className="text-[10px] text-slate-500 font-medium">Detector de jogada e análise de movimentos</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      ● Sincronizado
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 py-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-50 border border-zinc-200 rounded-xl p-2.5 text-center">
                        <div className="text-[10px] text-slate-500 font-bold">TOTAL</div>
                        <div className="text-2xl font-black text-slate-900 mt-0.5">
                          {Object.values(strokeCounts).reduce((a, b) => a + b, 0)}
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-zinc-200 rounded-xl p-2.5 text-center">
                        <div className="text-[10px] text-slate-500 font-bold">FOREHAND</div>
                        <div className="text-2xl font-black text-emerald-600 mt-0.5">{strokeCounts.Forehand}</div>
                      </div>
                      <div className="bg-slate-50 border border-zinc-200 rounded-xl p-2.5 text-center">
                        <div className="text-[10px] text-slate-500 font-bold">SAQUE</div>
                        <div className="text-2xl font-black text-orange-600 mt-0.5">{strokeCounts.Saque}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
                        <span>Capturas Recentes</span>
                        <span className="text-[11px] text-emerald-600 font-bold">WCSession</span>
                      </div>

                      <div className="space-y-2 no-scrollbar">
                        {trainingCaptures.map(cap => (
                          <div key={cap.id} className="bg-slate-50 border border-zinc-200 rounded-xl p-3 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <StrokeIcon strokeType={cap.strokeType} size={38} />
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-sm font-black text-slate-900">{cap.strokeType}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono font-bold">
                                    #{cap.attemptNumber}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {cap.samplesCount} amostras • {cap.peakForce}G
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              {cap.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-200 flex items-center justify-center">
                    <div className="w-32 h-1 bg-slate-300 rounded-full"></div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SIMPLIFIED DASHBOARD */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Dashboard Simplificado</h2>
                <p className="text-xs text-slate-500 mt-0.5">Métricas de aceleração e resumo da sessão ativa.</p>
              </div>

              <button
                onClick={toggleLiveRecording}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-sm ${
                  isLiveRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-900 text-white'
                }`}
              >
                {isLiveRecording ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isLiveRecording ? 'Parar Gravação' : 'Simular Telemetria'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                <div className="text-xs text-slate-500 font-bold uppercase">Total Amostras</div>
                <div className="text-3xl font-black text-slate-900 mt-1">
                  {isLiveRecording ? liveSamples.length * 15 : (currentSession?.totalSamples || 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                <div className="text-xs text-slate-500 font-bold uppercase">Movimentos Detectados</div>
                <div className="text-3xl font-black text-orange-600 mt-1">
                  {totalMotionsCount}
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                <div className="text-xs text-slate-500 font-bold uppercase">Duração</div>
                <div className="text-3xl font-black text-slate-900 mt-1">
                  {isLiveRecording ? formatDuration(liveDuration) : formatDuration(currentSession?.durationSeconds || 0)}
                </div>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Telemetria de Aceleração (X, Y, Z)</span>
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="index" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="accelX" name="Accel X" stroke="#16a34a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="accelY" name="Accel Y" stroke="#2563eb" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="accelZ" name="Accel Z" stroke="#ea580c" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: HISTORY */}
        {/* ========================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Histórico de Sessões</h2>
                <p className="text-xs text-slate-500 mt-1">Consulte sessões anteriores e exporte dados.</p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => exportData('csv')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-2 border border-zinc-300"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => exportData('json')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-2 border border-zinc-300"
                >
                  <Download className="w-3.5 h-3.5 text-orange-600" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-200 shadow-sm">
              {sessions.map(session => (
                <div key={session.id} className="p-5 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-900 text-base">{session.title}</div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center space-x-3">
                      <span>{new Date(session.date).toLocaleString()}</span>
                      <span>•</span>
                      <span>{session.totalSamples} amostras</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setSelectedSessionId(session.id);
                        setActiveTab('dashboard');
                      }}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="p-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl border border-zinc-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: INTEGRATION GUIDE */}
        {/* ========================================================= */}
        {activeTab === 'integration' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Guia Xcode & watchOS</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Estrutura Swift para conectar o Apple Watch ao aplicativo do iPhone via <code className="text-emerald-600 font-bold">WCSession</code>.
              </p>

              <div className="bg-slate-950 text-slate-200 border border-slate-800 rounded-2xl p-4 font-mono text-xs overflow-x-auto shadow-inner">
                <pre>{`import SwiftUI
import CoreMotion

struct WatchWorkoutView: View {
    @State private var selectedStroke: String? = nil
    @State private var attemptCounts = ["Forehand": 17, "Backhand": 12, "Saque": 15]
    
    var body: some View {
        VStack {
            List(["Forehand", "Backhand", "Saque"], id: \.self) { stroke in
                Button(stroke) { selectedStroke = stroke }
            }
        }
    }
}`}</pre>
              </div>
            </div>
          </div>
        )}

      </main>

      <footer className="border-t border-zinc-200 bg-white mt-16 py-8 text-center text-xs text-slate-500">
        <p>CourtTracker — Professional Tennis Motion Analytics</p>
      </footer>
    </div>
  );
}

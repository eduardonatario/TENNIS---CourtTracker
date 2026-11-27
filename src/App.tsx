import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Watch,
  Play,
  Square,
  RefreshCw,
  Download,
  Trash2,
  FileText,
  Code2,
  Smartphone,
  BarChart3,
  X,
  Settings,
  Camera,
  MapPin,
  User,
  Plus,
  Edit3,
  Check,
  Copy,
  Navigation,
  Home,
  Sparkles,
  Power
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
import { XCODE_FILES } from './xcodeCode';

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
  enabled: boolean;
}

interface TennisCourt {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface PlayerProfile {
  name: string;
  email: string;
  photoUrl: string | null;
}

interface CourtPhoto {
  id: string;
  dateKey: string;
  courtName: string;
  imageUrl: string;
  timestamp: string;
}

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
        src="./assets/aistudio/tennis-icone5_772cd9ff.png"
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
        src="./assets/aistudio/detectar_e_coletar_dados_ba0d4a09.png"
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

interface CaptureGroup {
  groupId: string;
  groupTitle: string;
  startTime: string;
  captures: TrainingCapture[];
}

const groupCapturesByThreeHours = (captures: TrainingCapture[]): CaptureGroup[] => {
  if (captures.length === 0) return [];
  const sorted = [...captures].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const groups: CaptureGroup[] = [];
  let currentGroup: TrainingCapture[] = [];

  sorted.forEach((cap, idx) => {
    if (idx === 0) {
      currentGroup.push(cap);
    } else {
      const prevCap = sorted[idx - 1];
      const diffMs = new Date(prevCap.timestamp).getTime() - new Date(cap.timestamp).getTime();
      const threeHoursMs = 3 * 60 * 60 * 1000;
      if (diffMs > threeHoursMs) {
        groups.push({
          groupId: `group-${groups.length}-${prevCap.id}`,
          groupTitle: `Sessão • ${new Date(prevCap.timestamp).toLocaleDateString()} (${currentGroup.length} detecções)`,
          startTime: prevCap.timestamp,
          captures: currentGroup
        });
        currentGroup = [cap];
      } else {
        currentGroup.push(cap);
      }
    }
  });

  if (currentGroup.length > 0) {
    const lastCap = currentGroup[currentGroup.length - 1];
    groups.push({
      groupId: `group-${groups.length}-${lastCap.id}`,
      groupTitle: `Sessão • ${new Date(lastCap.timestamp).toLocaleDateString()} (${currentGroup.length} detecções)`,
      startTime: lastCap.timestamp,
      captures: currentGroup
    });
  }

  return groups;
};

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DEFAULT_COURTS: TennisCourt[] = [
  { id: 'court-1', name: 'Quadra Central - Saibro', latitude: -23.5505, longitude: -46.6333 },
  { id: 'court-2', name: 'Clube Tênis Paulista - Rápida', latitude: -23.5629, longitude: -46.6544 },
  { id: 'court-3', name: 'Arena Open - Coberta', latitude: -23.5880, longitude: -46.6820 }
];

const DEFAULT_CAPTURES: TrainingCapture[] = [
  { id: 'cap-1', strokeType: 'Forehand', attemptNumber: 17, timestamp: new Date(Date.now() - 600000).toISOString(), durationSeconds: 4, samplesCount: 400, peakForce: 7.2, status: 'Synced', enabled: true },
  { id: 'cap-2', strokeType: 'Saque', attemptNumber: 15, timestamp: new Date(Date.now() - 1200000).toISOString(), durationSeconds: 5, samplesCount: 500, peakForce: 8.9, status: 'Synced', enabled: true },
  { id: 'cap-3', strokeType: 'Backhand', attemptNumber: 12, timestamp: new Date(Date.now() - 1800000).toISOString(), durationSeconds: 4, samplesCount: 380, peakForce: 6.5, status: 'Synced', enabled: true },
  { id: 'cap-4', strokeType: 'Forehand', attemptNumber: 11, timestamp: new Date(Date.now() - 3600000 * 6).toISOString(), durationSeconds: 4, samplesCount: 390, peakForce: 6.8, status: 'Synced', enabled: true },
  { id: 'cap-5', strokeType: 'Backhand', attemptNumber: 8, timestamp: new Date(Date.now() - 3600000 * 6 - 300000).toISOString(), durationSeconds: 3, samplesCount: 310, peakForce: 5.9, status: 'Synced', enabled: true }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'dashboard' | 'history' | 'integration'>('simulator');
  const [sessions, setSessions] = useState<TennisSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [watchStatus] = useState({
    connected: true,
    model: 'Apple Watch Ultra 2',
    watchOS: '11.2',
    batteryLevel: 88,
    rssi: -54
  });

  // iPhone App Navigation & Modals
  const [iphoneView, setIphoneView] = useState<'home' | 'settings'>('home');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  // Player Profile State (persisted)
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(() => {
    const saved = localStorage.getItem('tennistracker_profile');
    return saved
      ? JSON.parse(saved)
      : { name: 'Eduardo Natario', email: 'eduardonatario@gmail.com', photoUrl: null };
  });

  useEffect(() => {
    localStorage.setItem('tennistracker_profile', JSON.stringify(playerProfile));
  }, [playerProfile]);

  // Courts & Geolocation State (persisted)
  const [courts, setCourts] = useState<TennisCourt[]>(() => {
    const saved = localStorage.getItem('tennistracker_courts');
    return saved ? JSON.parse(saved) : DEFAULT_COURTS;
  });

  useEffect(() => {
    localStorage.setItem('tennistracker_courts', JSON.stringify(courts));
  }, [courts]);

  const [selectedCourtId, setSelectedCourtId] = useState<string>(() => courts[0]?.id || 'court-1');
  const [autoDetectedCourtId, setAutoDetectedCourtId] = useState<string | null>(null);
  const [geoStatusText, setGeoStatusText] = useState<string>('Verificando GPS...');

  // Add Court Form State inside Profile Modal
  const [newCourtName, setNewCourtName] = useState('');
  const [newCourtCoords, setNewCourtCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isDetectingNewCourtGps, setIsDetectingNewCourtGps] = useState(false);

  // Court Photos (persisted)
  const todayDateKey = new Date().toLocaleDateString('pt-BR');
  const [courtPhotos, setCourtPhotos] = useState<CourtPhoto[]>(() => {
    const saved = localStorage.getItem('tennistracker_photos');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('tennistracker_photos', JSON.stringify(courtPhotos));
  }, [courtPhotos]);

  const todaysCourtPhotos = courtPhotos.filter(p => p.dateKey === todayDateKey);

  // Live Camera Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Auto-recognize nearest court on open
  const runCourtAutoDetection = () => {
    if (!('geolocation' in navigator)) {
      setGeoStatusText('GPS indisponível no navegador');
      return;
    }
    setGeoStatusText('Buscando localização...');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        let closestCourt: TennisCourt | null = null;
        let minDistance = Infinity;
        for (const court of courts) {
          const d = haversineDistanceMeters(latitude, longitude, court.latitude, court.longitude);
          if (d < minDistance) {
            minDistance = d;
            closestCourt = court;
          }
        }
        if (closestCourt && minDistance <= 1000) {
          setSelectedCourtId(closestCourt.id);
          setAutoDetectedCourtId(closestCourt.id);
          setGeoStatusText(`Detectada via GPS (${Math.round(minDistance)}m)`);
        } else {
          setAutoDetectedCourtId(null);
          setGeoStatusText(`GPS ativo (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        }
      },
      () => {
        setGeoStatusText('Seleção manual (permissão GPS não concedida)');
      },
      { timeout: 6000 }
    );
  };

  useEffect(() => {
    runCourtAutoDetection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courts.length]);

  const handleDetectNewCourtLocation = () => {
    setIsDetectingNewCourtGps(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setNewCourtCoords({
            latitude: Number(pos.coords.latitude.toFixed(5)),
            longitude: Number(pos.coords.longitude.toFixed(5))
          });
          setIsDetectingNewCourtGps(false);
        },
        () => {
          // Fallback to simulated local court coordinates if iframe denies geolocation
          setNewCourtCoords({
            latitude: Number((-23.5505 + (Math.random() - 0.5) * 0.01).toFixed(5)),
            longitude: Number((-46.6333 + (Math.random() - 0.5) * 0.01).toFixed(5))
          });
          setIsDetectingNewCourtGps(false);
        },
        { timeout: 5000 }
      );
    } else {
      setNewCourtCoords({ latitude: -23.5505, longitude: -46.6333 });
      setIsDetectingNewCourtGps(false);
    }
  };

  const handleAddCourt = () => {
    if (!newCourtName.trim()) return;
    const coords = newCourtCoords || { latitude: -23.5505, longitude: -46.6333 };
    const created: TennisCourt = {
      id: `court-${Date.now()}`,
      name: newCourtName.trim(),
      latitude: coords.latitude,
      longitude: coords.longitude
    };
    setCourts(prev => [...prev, created]);
    setSelectedCourtId(created.id);
    setAutoDetectedCourtId(created.id);
    setGeoStatusText('Quadra adicionada e reconhecida');
    setNewCourtName('');
    setNewCourtCoords(null);
  };

  // Camera controls
  useEffect(() => {
    if (!showCameraModal) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCameraError(null);
      return;
    }

    let cancelled = false;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (cancelled) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          if (!cancelled) {
            setCameraError('Câmera ao vivo indisponível neste ambiente. Use o botão abaixo para escolher/tirar foto.');
          }
        });
    } else {
      setCameraError('Câmera não suportada neste navegador. Selecione uma foto abaixo.');
    }

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [showCameraModal]);

  const handleCapturePhotoFromVideo = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      saveTodayCourtPhoto(dataUrl);
      setShowCameraModal(false);
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        saveTodayCourtPhoto(reader.result);
        setShowCameraModal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveTodayCourtPhoto = (imageUrl: string) => {
    const activeCourt = courts.find(c => c.id === selectedCourtId);
    const newPhoto: CourtPhoto = {
      id: `photo-${Date.now()}`,
      dateKey: todayDateKey,
      courtName: activeCourt?.name || 'Quadra de Tênis',
      imageUrl,
      timestamp: new Date().toISOString()
    };
    setCourtPhotos(prev => [newPhoto, ...prev]);
  };

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPlayerProfile(prev => ({ ...prev, photoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Grouping & Training History State
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const [isDataCollectionEnabled, setIsDataCollectionEnabled] = useState(() => {
    const saved = localStorage.getItem('courttracker_data_collection');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('courttracker_data_collection', JSON.stringify(isDataCollectionEnabled));
  }, [isDataCollectionEnabled]);

  const [trainingCaptures, setTrainingCaptures] = useState<TrainingCapture[]>(() => {
    const saved = localStorage.getItem('tennistracker_training_captures');
    return saved ? JSON.parse(saved) : DEFAULT_CAPTURES;
  });

  useEffect(() => {
    localStorage.setItem('tennistracker_training_captures', JSON.stringify(trainingCaptures));
  }, [trainingCaptures]);

  const [editingCaptureId, setEditingCaptureId] = useState<string | null>(null);
  const [editStrokeType, setEditStrokeType] = useState<'Forehand' | 'Backhand' | 'Saque'>('Forehand');
  const [editPeakForce, setEditPeakForce] = useState<string>('7.0');

  const toggleCaptureEnabled = (id: string) => {
    setTrainingCaptures(prev =>
      prev.map(cap => (cap.id === id ? { ...cap, enabled: !cap.enabled } : cap))
    );
  };

  const startEditingCapture = (cap: TrainingCapture) => {
    setEditingCaptureId(cap.id);
    setEditStrokeType(cap.strokeType);
    setEditPeakForce(String(cap.peakForce));
  };

  const saveEditedCapture = (id: string) => {
    setTrainingCaptures(prev =>
      prev.map(cap =>
        cap.id === id
          ? {
              ...cap,
              strokeType: editStrokeType,
              peakForce: Number(editPeakForce) || cap.peakForce
            }
          : cap
      )
    );
    setEditingCaptureId(null);
  };

  const keepOnlyNewestTrainingData = () => {
    const sorted = [...trainingCaptures].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const newestIds = new Set(sorted.slice(0, 3).map(c => c.id));
    setTrainingCaptures(prev =>
      prev.map(cap => ({
        ...cap,
        enabled: newestIds.has(cap.id)
      }))
    );
  };

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
  const [hasFinishedSession, setHasFinishedSession] = useState(false);
  const [watchScreen, setWatchScreen] = useState<'splash' | 'main-menu' | 'strokes-menu' | 'collecting' | 'playing'>('splash');
  const [activeStrokeType, setActiveStrokeType] = useState<'Forehand' | 'Backhand' | 'Saque' | null>(null);
  const [collectionTimer, setCollectionTimer] = useState(0);

  const startNewSession = () => {
    setHasFinishedSession(false);
    setMatchTimer(0);
    setDetectedCounts({
      Forehand: 0,
      Backhand: 0,
      Saque: 0
    });
    setLiveDuration(0);
    setLiveSamples([]);
    setLiveStrokesCount({
      Forehand: 0,
      Backhand: 0,
      Saque: 0,
      'Normal Movement': 0
    });
    setWatchScreen('playing');
  };

  const finishWatchSession = () => {
    setHasFinishedSession(true);
    setIphoneView('home');
    setWatchScreen(isDataCollectionEnabled ? 'main-menu' : 'splash');
  };

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
      status: 'Synced',
      enabled: true
    };

    setTrainingCaptures(prev => [newCapture, ...prev]);
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
      filename = `tennistracker-export-${Date.now()}.json`;
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
      filename = `tennistracker-export-${Date.now()}.csv`;
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
  const liveTotal = detectedCounts.Forehand + detectedCounts.Backhand + detectedCounts.Saque;
  const selectedCourt = courts.find(c => c.id === selectedCourtId) || courts[0];

  // Xcode Guide state
  const [xcodePlatformFilter, setXcodePlatformFilter] = useState<'all' | 'watchOS' | 'iOS'>('all');
  const [selectedXcodeFileId, setSelectedXcodeFileId] = useState<string>(XCODE_FILES[0].id);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);

  const filteredXcodeFiles = XCODE_FILES.filter(
    f => xcodePlatformFilter === 'all' || f.platform === xcodePlatformFilter
  );
  const activeXcodeFile =
    filteredXcodeFiles.find(f => f.id === selectedXcodeFileId) || filteredXcodeFiles[0];

  const handleCopyXcode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFileId(id);
    setTimeout(() => setCopiedFileId(null), 2000);
  };

  const playerInitials = playerProfile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('') || 'TT';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <img
                src="./assets/aistudio/tennis-icone3-saque_b6af230a.png"
                alt="App Icon"
                className="w-11 h-11 rounded-xl object-cover border border-zinc-300 shadow-sm"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-wider text-slate-900">
                  TENNIS <span className="text-emerald-600">TRACKER</span>
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  watchOS & iOS
                </span>
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
              {/* Apple Watch Simulator (+50% font scale across all Watch UI texts) */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="text-xs font-bold text-slate-500 mb-3 flex items-center space-x-2">
                  <Watch className="w-4 h-4 text-emerald-600" />
                  <span>APPLE WATCH • TENNIS TRACKER</span>
                </div>

                <div className="w-[360px] h-[435px] bg-black rounded-[50px] border-[6px] border-zinc-800 shadow-2xl p-4 flex flex-col justify-between relative overflow-hidden text-white no-scrollbar">
                  <div className="absolute right-[-10px] top-24 w-2 h-12 bg-zinc-700 rounded-r-md"></div>
                  <div className="absolute right-[-10px] top-12 w-2 h-8 bg-zinc-800 rounded-r-md"></div>

                  {/* WATCH SCREEN 1: SPLASH */}
                  {watchScreen === 'splash' && (
                    <div className="flex flex-col h-full justify-between items-center text-center py-5 px-1">
                      <div className="my-auto flex flex-col items-center justify-center">
                        <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-[#a3e635] shadow-xl shadow-[#a3e635]/20 bg-black flex items-center justify-center">
                          <img
                            src="./assets/aistudio/tennis-icone3-saque_b6af230a.png"
                            alt="Tennis Saque Icon"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (!isDataCollectionEnabled) {
                            setHasFinishedSession(false);
                            setMatchTimer(0);
                          }
                          setWatchScreen(isDataCollectionEnabled ? 'main-menu' : 'playing');
                        }}
                        className="w-full py-4 bg-[#a3e635] hover:bg-[#8cc62d] text-slate-950 rounded-full font-black text-2xl uppercase tracking-wider shadow-lg shadow-[#a3e635]/30 transition-all active:scale-95"
                      >
                        INICIAR
                      </button>
                    </div>
                  )}

                  {/* WATCH SCREEN 2: MAIN MENU */}
                  {watchScreen === 'main-menu' && (
                    <div className="flex flex-col h-full justify-between py-1.5">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                        <button
                          onClick={() => setWatchScreen('splash')}
                          className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md transition-all"
                          title="Fechar"
                        >
                          <X className="w-4 h-4 stroke-[3]" />
                        </button>
                        <span className="text-lg font-mono font-bold text-zinc-300">11:47</span>
                      </div>

                      <div className="flex-1 flex flex-col justify-center space-y-3.5 py-2">
                        {isDataCollectionEnabled && (
                          <button
                            onClick={() => setWatchScreen('strokes-menu')}
                            className="w-full min-h-[104px] bg-white hover:bg-zinc-100 text-slate-950 rounded-3xl p-3.5 flex items-center space-x-3.5 text-left transition-all active:scale-95 shadow-md"
                          >
                            <MenuImageIcon type="stats" size={46} />
                            <div className="min-w-0">
                              <div className="text-[21px] leading-tight font-black text-slate-950 uppercase tracking-tight">
                                COLETAR DADOS
                              </div>
                              <div className="text-[15px] text-slate-600 font-bold uppercase mt-0.5 leading-tight">
                                Treinamento ML
                              </div>
                            </div>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setHasFinishedSession(false);
                            setMatchTimer(0);
                            setWatchScreen('playing');
                          }}
                          className="w-full min-h-[104px] bg-white hover:bg-zinc-100 text-slate-950 rounded-3xl p-3.5 flex items-center space-x-3.5 text-left transition-all active:scale-95 shadow-md"
                        >
                          <MenuImageIcon type="tennis-ball" size={46} />
                          <div className="min-w-0">
                            <div className="text-[21px] leading-tight font-black text-slate-950 uppercase tracking-tight">
                              JOGAR E DETECTAR
                            </div>
                            <div className="text-[15px] text-slate-600 font-bold uppercase mt-0.5 leading-tight">
                              Partida ao vivo
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* WATCH SCREEN 3: STROKES MENU */}
                  {watchScreen === 'strokes-menu' && (
                    <div className="flex flex-col h-full justify-between no-scrollbar overflow-hidden">
                      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                        <button
                          onClick={() => setWatchScreen('main-menu')}
                          className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md transition-all"
                          title="Fechar"
                        >
                          <X className="w-4 h-4 stroke-[3]" />
                        </button>
                        <span className="text-lg font-mono font-bold text-zinc-300">11:47</span>
                      </div>

                      <div className="py-1 text-center">
                        <div className="text-[22px] leading-tight font-black text-white uppercase tracking-wide">
                          QUAL MOVIMENTO COLETAR?
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-center space-y-2.5 no-scrollbar overflow-hidden py-1">
                        {[
                          { key: 'Forehand', label: 'FOREHAND', count: strokeCounts.Forehand, bg: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
                          { key: 'Backhand', label: 'BACKHAND', count: strokeCounts.Backhand, bg: 'bg-blue-600 hover:bg-blue-500 text-white' },
                          { key: 'Saque', label: 'SAQUE', count: strokeCounts.Saque, bg: 'bg-orange-600 hover:bg-orange-500 text-white' },
                        ].map(item => (
                          <button
                            key={item.key}
                            onClick={() => startCollection(item.key as any)}
                            className={`w-full px-5 py-3 rounded-full flex items-center justify-between shadow-lg transition-all active:scale-95 ${item.bg}`}
                          >
                            <span className="text-[28px] leading-none font-black tracking-tight">{item.label}</span>
                            <span className="text-[36px] leading-none font-mono font-black">{item.count}</span>
                          </button>
                        ))}
                      </div>

                      <div className="pt-1.5 border-t border-zinc-800 text-center text-[15px] leading-tight text-zinc-300 font-bold uppercase tracking-wide">
                        Selecione e repita o movimento
                      </div>
                    </div>
                  )}

                  {/* WATCH SCREEN 4: ACTIVE COLLECTION */}
                  {watchScreen === 'collecting' && (
                    <div className="flex flex-col h-full justify-between items-center text-center py-1 no-scrollbar overflow-hidden">
                      <div className="w-full flex items-center justify-between">
                        <button
                          onClick={() => setWatchScreen('strokes-menu')}
                          className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md transition-all"
                          title="Fechar"
                        >
                          <X className="w-4 h-4 stroke-[3]" />
                        </button>
                        <span className={`text-lg font-mono font-black uppercase tracking-wider animate-pulse ${activeTheme.text}`}>
                          ● GRAVANDO
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[15px] text-zinc-400 uppercase tracking-widest font-black">GOLPE ATIVO</div>
                        <div className={`text-[40px] leading-none font-black uppercase tracking-wide ${activeTheme.text}`}>
                          {activeStrokeType}
                        </div>
                        <div className="text-[56px] leading-none font-mono font-black text-white mt-1">
                          00:{collectionTimer.toString().padStart(2, '0')}s
                        </div>
                      </div>

                      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 my-1 space-y-1.5">
                        <div className="flex items-center justify-between text-[16px] text-zinc-300 font-mono uppercase tracking-wider">
                          <span>COREMOTION</span>
                          <span className={`font-black ${activeTheme.text}`}>COLETANDO</span>
                        </div>
                        <div className="flex items-center justify-center space-x-1.5 h-8">
                          {[50, 80, 35, 100, 65, 90, 40, 95, 60, 85].map((_, i) => (
                            <span
                              key={i}
                              className={`w-2 rounded-full animate-pulse ${
                                activeStrokeType === 'Forehand'
                                  ? 'bg-emerald-500'
                                  : activeStrokeType === 'Backhand'
                                  ? 'bg-blue-500'
                                  : 'bg-orange-500'
                              }`}
                              style={{ height: `${Math.floor(Math.random() * 22 + 8)}px`, animationDelay: `${i * 90}ms` }}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={finishCollection}
                        className={`w-full py-3.5 rounded-full font-black text-2xl uppercase tracking-wider shadow-lg transition-all active:scale-95 text-white ${activeTheme.bg} ${activeTheme.hover}`}
                      >
                        CONCLUIR
                      </button>
                    </div>
                  )}

                  {/* WATCH SCREEN 5: PLAYING LIVE DETECTION */}
                  {watchScreen === 'playing' && (
                    <div className="flex flex-col h-full justify-between py-1 no-scrollbar overflow-hidden">
                      <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                        {isDataCollectionEnabled ? (
                          <button
                            onClick={() => setWatchScreen('main-menu')}
                            className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md transition-all"
                            title="Fechar"
                          >
                            <X className="w-4 h-4 stroke-[3]" />
                          </button>
                        ) : (
                          <div />
                        )}
                        <span className="text-[15px] text-emerald-400 font-mono font-black animate-pulse">
                          ● DETECTANDO
                        </span>
                      </div>

                      {/* TEMPO DE PARTIDA: timer */}
                      <div className="pt-1 text-center flex items-center justify-center space-x-2">
                        <span className="text-[21px] leading-tight font-black text-white uppercase tracking-tight">
                          TEMPO DE PARTIDA:
                        </span>
                        <span className="text-[23px] leading-tight font-black text-white">
                          {formatDuration(matchTimer)}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col justify-center space-y-2.5 py-1 no-scrollbar">
                        {[
                          { key: 'Forehand', label: 'FOREHAND', count: detectedCounts.Forehand, bg: 'bg-emerald-600 text-white' },
                          { key: 'Backhand', label: 'BACKHAND', count: detectedCounts.Backhand, bg: 'bg-blue-600 text-white' },
                          { key: 'Saque', label: 'SAQUE', count: detectedCounts.Saque, bg: 'bg-orange-600 text-white' },
                        ].map(item => (
                          <div
                            key={item.key}
                            className={`w-full px-5 py-3 rounded-full flex items-center justify-between shadow-md ${item.bg}`}
                          >
                            <span className="text-[28px] leading-none font-black tracking-tight">{item.label}</span>
                            <span className="text-[36px] leading-none font-mono font-black">{item.count}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={finishWatchSession}
                        className="w-full py-3 rounded-full font-black text-lg uppercase tracking-wider shadow-lg animate-[pulse_3s_infinite] bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-600"
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
                  <span>APP DO IPHONE • TENNIS TRACKER</span>
                </div>

                <div className="w-[390px] h-[760px] bg-white rounded-[44px] border-[8px] border-slate-800 shadow-2xl flex flex-col justify-between relative overflow-hidden no-scrollbar">
                  {/* Dynamic Island / Notch */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-slate-900 mr-2"></div>
                    <div className="w-12 h-1 bg-slate-900 rounded-full"></div>
                  </div>

                  {/* iPhone Header */}
                  <div className="pt-8 px-4 pb-3 border-b border-zinc-200 flex items-center justify-between bg-white z-10 shrink-0">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img
                        src="./assets/aistudio/tennis-icone3-saque_b6af230a.png"
                        alt="iPhone App Icon"
                        className="w-9 h-9 rounded-xl object-cover border border-zinc-300 shadow-xs shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">TENNIS TRACKER</h3>
                        <p className="text-[10px] text-slate-500 font-medium leading-tight truncate">
                          Detector de jogada e análise de movimentos
                        </p>
                      </div>
                    </div>

                    {/* Circular Player Profile Button */}
                    <button
                      onClick={() => setShowProfileModal(true)}
                      title="Editar Perfil e Quadras"
                      className="relative group shrink-0 ml-2 focus:outline-none"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500 bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-sm group-hover:scale-105 transition-transform">
                        {playerProfile.photoUrl ? (
                          <img
                            src={playerProfile.photoUrl}
                            alt={playerProfile.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{playerInitials}</span>
                        )}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </button>
                  </div>

                  {/* iPhone Scrollable Content */}
                  <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-3.5">
                    {iphoneView === 'home' ? (
                      <>
                        {/* Ao terminar a sessão do dia no Watch, mostra Tempo Decorrido + Placar no topo */}
                        {hasFinishedSession && (
                          <div className="space-y-2.5">
                            <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-md border border-slate-800">
                              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                <span>● Sessão Finalizada ({todayDateKey})</span>
                                <span>{selectedCourt?.name}</span>
                              </div>
                              <div className="mt-1.5 flex items-baseline justify-between">
                                <span className="text-xs font-black uppercase text-zinc-300">
                                  Tempo decorrido da sessão:
                                </span>
                                <span className="text-2xl font-mono font-black text-[#a3e635]">
                                  {formatDuration(matchTimer)}
                                </span>
                              </div>
                            </div>

                            {/* Placar 2x2: Forehand & Backhand acima, Saque & Total abaixo */}
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2.5">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center shadow-xs">
                                  <div className="text-xs font-black text-emerald-700 tracking-wide">FOREHAND</div>
                                  <div className="text-3xl font-black text-emerald-700 mt-0.5 font-mono">
                                    {detectedCounts.Forehand}
                                  </div>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center shadow-xs">
                                  <div className="text-xs font-black text-blue-700 tracking-wide">BACKHAND</div>
                                  <div className="text-3xl font-black text-blue-700 mt-0.5 font-mono">
                                    {detectedCounts.Backhand}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2.5">
                                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center shadow-xs">
                                  <div className="text-xs font-black text-orange-700 tracking-wide">SAQUE</div>
                                  <div className="text-3xl font-black text-orange-700 mt-0.5 font-mono">
                                    {detectedCounts.Saque}
                                  </div>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center shadow-xs">
                                  <div className="text-xs font-black text-zinc-300 tracking-wide">TOTAL</div>
                                  <div className="text-3xl font-black text-white mt-0.5 font-mono">{liveTotal}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 1 - Detecção da Quadra (com resumo do mapa de GPS) */}
                        <div className="bg-slate-50 border border-zinc-200 rounded-2xl p-3 space-y-2.5 shadow-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <MapPin className="w-4 h-4 text-emerald-600" />
                              <span className="text-xs font-black text-slate-900 uppercase">
                                1. Detecção da Quadra
                              </span>
                            </div>
                            <button
                              onClick={runCourtAutoDetection}
                              className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center space-x-1 transition-colors"
                            >
                              <Navigation className="w-2.5 h-2.5" />
                              <span>Detectar GPS</span>
                            </button>
                          </div>

                          {/* Resumo visual do Mapa de GPS */}
                          <div className="relative h-24 rounded-xl overflow-hidden border border-emerald-200 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 p-2.5 flex flex-col justify-between text-white">
                            {/* Grid lines + stylized court outline */}
                            <div
                              className="absolute inset-0 opacity-20"
                              style={{
                                backgroundImage:
                                  'linear-gradient(to right, #34d399 1px, transparent 1px), linear-gradient(to bottom, #34d399 1px, transparent 1px)',
                                backgroundSize: '18px 18px'
                              }}
                            />
                            <div className="relative z-10 flex items-center justify-between text-[10px]">
                              <span className="px-2 py-0.5 rounded-full bg-black/50 border border-emerald-400/40 font-bold text-emerald-300 flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                <span>Mapa GPS</span>
                              </span>
                              <span className="font-mono text-[9px] text-zinc-300 bg-black/40 px-1.5 py-0.5 rounded">
                                {selectedCourt
                                  ? `${selectedCourt.latitude.toFixed(4)}, ${selectedCourt.longitude.toFixed(4)}`
                                  : '-23.5505, -46.6333'}
                              </span>
                            </div>

                            <div className="relative z-10 flex items-center justify-between">
                              <div className="flex items-center space-x-1.5">
                                <div className="w-6 h-6 rounded-full bg-[#a3e635] text-slate-950 flex items-center justify-center shadow-md">
                                  <MapPin className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="text-[11px] font-black leading-tight truncate max-w-[190px]">
                                    {selectedCourt?.name}
                                  </div>
                                  <div className="text-[9px] text-emerald-300 leading-tight">{geoStatusText}</div>
                                </div>
                              </div>
                              {autoDetectedCourtId === selectedCourtId && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-black">
                                  AUTO
                                </span>
                              )}
                            </div>
                          </div>

                          <select
                            value={selectedCourtId}
                            onChange={e => setSelectedCourtId(e.target.value)}
                            className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            {courts.map(court => (
                              <option key={court.id} value={court.id}>
                                {court.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 2 - Foto da Quadra / Abrir Câmera */}
                        <div className="bg-slate-50 border border-zinc-200 rounded-2xl p-3 space-y-2.5 shadow-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <Camera className="w-4 h-4 text-blue-600" />
                              <span className="text-xs font-black text-slate-900 uppercase">
                                2. Foto da Quadra ({todayDateKey})
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">
                              {todaysCourtPhotos.length} foto(s)
                            </span>
                          </div>

                          <button
                            onClick={() => setShowCameraModal(true)}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 flex items-center justify-center space-x-2"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Abrir Câmera e Tirar Foto</span>
                          </button>

                          {todaysCourtPhotos.length > 0 && (
                            <div className="space-y-2 pt-1">
                              {todaysCourtPhotos.slice(0, 2).map(photo => (
                                <div key={photo.id} className="relative rounded-xl overflow-hidden border border-zinc-200 bg-black">
                                  <img
                                    src={photo.imageUrl}
                                    alt={photo.courtName}
                                    className="w-full h-32 object-cover"
                                  />
                                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex items-center justify-between text-white">
                                    <div>
                                      <div className="text-[10px] font-bold">{photo.courtName}</div>
                                      <div className="text-[9px] text-zinc-300">
                                        {new Date(photo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setCourtPhotos(prev => prev.filter(p => p.id !== photo.id))}
                                      className="p-1 bg-red-600/80 hover:bg-red-600 rounded-lg text-white"
                                      title="Remover foto"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 3 - Iniciar Nova Sessão */}
                        <div className="space-y-1.5">
                          <button
                            onClick={startNewSession}
                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-black uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
                          >
                            <RefreshCw className="w-4 h-4 text-[#a3e635]" />
                            <span>3. Iniciar Nova Sessão</span>
                          </button>
                          <div className="flex items-center justify-between px-1 text-[11px]">
                            <span className="text-slate-500 font-semibold flex items-center space-x-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  watchScreen === 'playing' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                }`}
                              />
                              <span>
                                {watchScreen === 'playing' ? 'Partida ao vivo sincronizada' : 'Pronto para iniciar partida'}
                              </span>
                            </span>
                            <span className="font-mono font-black text-slate-800">
                              {formatDuration(matchTimer)}
                            </span>
                          </div>
                        </div>

                        {/* Placar ao vivo quando a sessão ainda está ativa/não finalizada */}
                        {!hasFinishedSession && (
                          <div className="space-y-2 pt-1">
                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center shadow-xs">
                                <div className="text-xs font-black text-emerald-700 tracking-wide">FOREHAND</div>
                                <div className="text-3xl font-black text-emerald-700 mt-0.5 font-mono">
                                  {detectedCounts.Forehand}
                                </div>
                              </div>
                              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center shadow-xs">
                                <div className="text-xs font-black text-blue-700 tracking-wide">BACKHAND</div>
                                <div className="text-3xl font-black text-blue-700 mt-0.5 font-mono">
                                  {detectedCounts.Backhand}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center shadow-xs">
                                <div className="text-xs font-black text-orange-700 tracking-wide">SAQUE</div>
                                <div className="text-3xl font-black text-orange-700 mt-0.5 font-mono">
                                  {detectedCounts.Saque}
                                </div>
                              </div>
                              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center shadow-xs">
                                <div className="text-xs font-black text-zinc-300 tracking-wide">TOTAL</div>
                                <div className="text-3xl font-black text-white mt-0.5 font-mono">{liveTotal}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* SETTINGS VIEW (Coleta de dados + Histórico de treinamento editável/desabilitável) */
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                            Configurações & Treinamento
                          </h4>
                          <button
                            onClick={() => setIphoneView('home')}
                            className="text-xs font-bold text-slate-600 hover:text-slate-900"
                          >
                            Voltar
                          </button>
                        </div>

                        {/* Toggle Coleta de Dados no Watch */}
                        <div className="bg-slate-50 border border-zinc-200 rounded-2xl p-3 flex items-center justify-between shadow-xs">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                              <Activity className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-black text-slate-900">Coleta de Dados no Watch</div>
                              <div className="text-[10px] text-slate-500">Habilita menu de coleta ML</div>
                            </div>
                          </div>
                          <button
                            onClick={() => setIsDataCollectionEnabled(!isDataCollectionEnabled)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                              isDataCollectionEnabled ? 'bg-emerald-600' : 'bg-zinc-300'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                isDataCollectionEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Histórico Completo de Treinamento */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-black text-slate-900 uppercase">Histórico de Treinamento</div>
                              <div className="text-[10px] text-slate-500">
                                {trainingCaptures.filter(c => c.enabled).length} ativos de {trainingCaptures.length} capturas
                              </div>
                            </div>
                            <button
                              onClick={keepOnlyNewestTrainingData}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-black flex items-center space-x-1 transition-colors"
                              title="Desabilita dados antigos e mantém apenas os movimentos mais novos"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Só mais novos</span>
                            </button>
                          </div>

                          {/* Agrupamento por sessão de 3 horas com edição e desabilitação */}
                          <div className="space-y-2 no-scrollbar">
                            {groupCapturesByThreeHours(trainingCaptures).map((group, groupIdx) => {
                              const isExpanded = expandedGroups[group.groupId] ?? groupIdx === 0;
                              return (
                                <div key={group.groupId} className="bg-slate-50 border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
                                  <button
                                    onClick={() => toggleGroup(group.groupId)}
                                    className="w-full p-2.5 flex items-center justify-between bg-slate-100/90 hover:bg-slate-100 text-left transition-all"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
                                        {group.captures.filter(c => c.enabled).length}/{group.captures.length}
                                      </div>
                                      <div>
                                        <div className="text-xs font-black text-slate-900">{group.groupTitle}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">
                                          {new Date(group.startTime).toLocaleString()}
                                        </div>
                                      </div>
                                    </div>
                                    <span className={`text-xs font-bold text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                      ▼
                                    </span>
                                  </button>

                                  {isExpanded && (
                                    <div className="divide-y divide-zinc-200 p-2 space-y-1.5 bg-white">
                                      {group.captures.map(cap => (
                                        <div
                                          key={cap.id}
                                          className={`p-2 rounded-xl transition-all ${
                                            cap.enabled ? 'bg-white' : 'bg-zinc-100/80 opacity-60'
                                          }`}
                                        >
                                          {editingCaptureId === cap.id ? (
                                            <div className="space-y-2">
                                              <div className="flex items-center space-x-2">
                                                <select
                                                  value={editStrokeType}
                                                  onChange={e => setEditStrokeType(e.target.value as any)}
                                                  className="flex-1 text-xs font-bold border border-zinc-300 rounded-lg px-2 py-1"
                                                >
                                                  <option value="Forehand">Forehand</option>
                                                  <option value="Backhand">Backhand</option>
                                                  <option value="Saque">Saque</option>
                                                </select>
                                                <input
                                                  type="number"
                                                  step="0.1"
                                                  value={editPeakForce}
                                                  onChange={e => setEditPeakForce(e.target.value)}
                                                  className="w-16 text-xs font-mono border border-zinc-300 rounded-lg px-2 py-1"
                                                />
                                              </div>
                                              <div className="flex justify-end space-x-1.5">
                                                <button
                                                  onClick={() => setEditingCaptureId(null)}
                                                  className="px-2 py-1 text-[10px] font-bold text-slate-600 bg-zinc-200 rounded-lg"
                                                >
                                                  Cancelar
                                                </button>
                                                <button
                                                  onClick={() => saveEditedCapture(cap.id)}
                                                  className="px-2 py-1 text-[10px] font-bold text-white bg-emerald-600 rounded-lg flex items-center space-x-1"
                                                >
                                                  <Check className="w-3 h-3" />
                                                  <span>Salvar</span>
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center space-x-2.5 min-w-0">
                                                <StrokeIcon strokeType={cap.strokeType} size={32} />
                                                <div className="min-w-0">
                                                  <div className="flex items-center space-x-1.5">
                                                    <span className="text-xs font-black text-slate-900">{cap.strokeType}</span>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono font-bold">
                                                      #{cap.attemptNumber}
                                                    </span>
                                                    {!cap.enabled && (
                                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                                                        Desabilitado
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-[10px] text-slate-500 font-mono truncate">
                                                    {new Date(cap.timestamp).toLocaleString()} • {cap.peakForce}G
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="flex items-center space-x-1 shrink-0 ml-1">
                                                <button
                                                  onClick={() => startEditingCapture(cap)}
                                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                                                  title="Editar captura"
                                                >
                                                  <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => toggleCaptureEnabled(cap.id)}
                                                  className={`p-1.5 rounded-lg transition-colors ${
                                                    cap.enabled
                                                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                                      : 'bg-zinc-200 hover:bg-zinc-300 text-slate-600'
                                                  }`}
                                                  title={cap.enabled ? 'Desabilitar treino' : 'Habilitar treino'}
                                                >
                                                  <Power className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* iPhone Bottom Footer Bar (Home + Configurações) */}
                  <div className="border-t border-zinc-200 bg-white px-6 py-2.5 flex items-center justify-around shrink-0">
                    <button
                      onClick={() => setIphoneView('home')}
                      className={`flex flex-col items-center space-y-0.5 text-[11px] font-bold transition-colors ${
                        iphoneView === 'home' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <Home className="w-5 h-5" />
                      <span>Partida</span>
                    </button>
                    <button
                      onClick={() => setIphoneView('settings')}
                      className={`flex flex-col items-center space-y-0.5 text-[11px] font-bold transition-colors ${
                        iphoneView === 'settings' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <Settings className="w-5 h-5" />
                      <span>Configurações</span>
                    </button>
                  </div>

                  {/* IN-IPHONE MODAL 1: PLAYER PROFILE & COURTS EDITOR */}
                  {showProfileModal && (
                    <div className="absolute inset-0 bg-white z-30 flex flex-col pt-8">
                      <div className="px-4 pb-3 border-b border-zinc-200 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-sm font-black text-slate-900">Perfil do Jogador & Quadras</h4>
                        </div>
                        <button
                          onClick={() => setShowProfileModal(false)}
                          className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-slate-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
                        {/* Avatar Edit */}
                        <div className="flex flex-col items-center space-y-2">
                          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500 bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-md">
                            {playerProfile.photoUrl ? (
                              <img
                                src={playerProfile.photoUrl}
                                alt={playerProfile.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{playerInitials}</span>
                            )}
                          </div>
                          <label className="cursor-pointer px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold">
                            Alterar Foto
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleProfilePhotoUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Name & Email */}
                        <div className="space-y-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Nome do Usuário</label>
                            <input
                              type="text"
                              value={playerProfile.name}
                              onChange={e => setPlayerProfile(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full border border-zinc-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">E-mail</label>
                            <input
                              type="email"
                              value={playerProfile.email}
                              onChange={e => setPlayerProfile(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full border border-zinc-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                            />
                          </div>
                        </div>

                        {/* Courts List + Add New Court with Geolocation */}
                        <div className="pt-2 border-t border-zinc-200 space-y-2.5">
                          <div className="text-xs font-black text-slate-900 uppercase">Quadras em que Joga</div>

                          <div className="space-y-1.5">
                            {courts.map(court => (
                              <div
                                key={court.id}
                                className="bg-slate-50 border border-zinc-200 rounded-xl p-2.5 flex items-center justify-between"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 truncate">{court.name}</div>
                                  <div className="text-[10px] font-mono text-slate-500">
                                    {court.latitude.toFixed(4)}, {court.longitude.toFixed(4)}
                                  </div>
                                </div>
                                {courts.length > 1 && (
                                  <button
                                    onClick={() => setCourts(prev => prev.filter(c => c.id !== court.id))}
                                    className="p-1.5 text-slate-400 hover:text-red-600"
                                    title="Remover quadra"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-2">
                            <div className="text-xs font-black text-emerald-900">Adicionar Nova Quadra</div>
                            <input
                              type="text"
                              placeholder="Nome da quadra (ex: Tênis Clube)"
                              value={newCourtName}
                              onChange={e => setNewCourtName(e.target.value)}
                              className="w-full bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                            />
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={handleDetectNewCourtLocation}
                                className="flex-1 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1"
                              >
                                <Navigation className="w-3 h-3" />
                                <span>
                                  {isDetectingNewCourtGps
                                    ? 'Detectando...'
                                    : newCourtCoords
                                    ? `${newCourtCoords.latitude}, ${newCourtCoords.longitude}`
                                    : 'Detectar via Geolocalização'}
                                </span>
                              </button>
                            </div>
                            <button
                              onClick={handleAddCourt}
                              disabled={!newCourtName.trim()}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-300 text-white rounded-lg text-xs font-black uppercase flex items-center justify-center space-x-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Salvar Quadra</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border-t border-zinc-200">
                        <button
                          onClick={() => setShowProfileModal(false)}
                          className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase"
                        >
                          Concluir Edição
                        </button>
                      </div>
                    </div>
                  )}

                  {/* IN-IPHONE MODAL 2: CAMERA VIEWFINDER */}
                  {showCameraModal && (
                    <div className="absolute inset-0 bg-black z-30 flex flex-col justify-between pt-8 text-white">
                      <div className="px-4 pb-3 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider">Câmera • Foto na Quadra</span>
                        <button
                          onClick={() => setShowCameraModal(false)}
                          className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1 flex flex-col items-center justify-center px-4">
                        {!cameraError ? (
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-80 object-cover rounded-2xl border border-zinc-700 bg-zinc-900"
                          />
                        ) : (
                          <div className="w-full h-64 rounded-2xl border border-zinc-700 bg-zinc-900 p-6 flex flex-col items-center justify-center text-center space-y-3">
                            <Camera className="w-10 h-10 text-zinc-400" />
                            <p className="text-xs text-zinc-300">{cameraError}</p>
                          </div>
                        )}
                      </div>

                      <div className="p-5 space-y-3 bg-zinc-950 border-t border-zinc-800">
                        {!cameraError && (
                          <button
                            onClick={handleCapturePhotoFromVideo}
                            className="w-full py-3 bg-[#a3e635] hover:bg-[#8cc62d] text-slate-950 rounded-full font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Tirar Foto Agora</span>
                          </button>
                        )}
                        <label className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer">
                          <span>Selecionar / Câmera do Dispositivo</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}
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
                <div className="text-3xl font-black text-orange-600 mt-1">{totalMotionsCount}</div>
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '12px',
                        color: '#0f172a',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
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
        {/* TAB 4: XCODE GUIDE (watchOS & iOS SwiftUI Code) */}
        {/* ========================================================= */}
        {activeTab === 'integration' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Guia Xcode • watchOS & iOS (SwiftUI)</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Código nativo completo em Swift para Apple Watch (CoreMotion + WatchConnectivity) e iPhone (CoreLocation + Câmera + WCSession).
                  </p>
                </div>

                <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-zinc-200">
                  {(['all', 'watchOS', 'iOS'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setXcodePlatformFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        xcodePlatformFilter === filter
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {filter === 'all' ? 'Todos' : filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* File Selector */}
                <div className="lg:col-span-4 space-y-2">
                  {filteredXcodeFiles.map(file => (
                    <button
                      key={file.id}
                      onClick={() => setSelectedXcodeFileId(file.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        activeXcodeFile?.id === file.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black font-mono truncate">{file.filename}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            file.platform === 'watchOS'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {file.platform}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] mt-1 leading-snug ${
                          activeXcodeFile?.id === file.id ? 'text-zinc-300' : 'text-slate-500'
                        }`}
                      >
                        {file.subtitle}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Code Viewer */}
                {activeXcodeFile && (
                  <div className="lg:col-span-8 bg-slate-950 text-slate-200 border border-slate-800 rounded-2xl overflow-hidden shadow-inner flex flex-col">
                    <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Code2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-mono font-bold text-white">{activeXcodeFile.filename}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-zinc-300 font-bold">
                          {activeXcodeFile.platform}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyXcode(activeXcodeFile.code, activeXcodeFile.id)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-lg flex items-center space-x-1.5 transition-colors"
                      >
                        {copiedFileId === activeXcodeFile.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Swift</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-4 font-mono text-xs overflow-x-auto max-h-[560px] overflow-y-auto">
                      <pre className="leading-relaxed">{activeXcodeFile.code}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 bg-white mt-16 py-8 text-center text-xs text-slate-500">
        <p>TENNIS TRACKER — Professional Tennis Motion Analytics</p>
      </footer>
    </div>
  );
}

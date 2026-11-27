export interface XcodeFileSpec {
  id: string;
  platform: 'watchOS' | 'iOS';
  filename: string;
  subtitle: string;
  code: string;
}

export const XCODE_FILES: XcodeFileSpec[] = [
  {
    id: 'watch-app',
    platform: 'watchOS',
    filename: 'TennisTrackerWatchApp.swift',
    subtitle: 'Entry point do app watchOS com fluxo condicional',
    code: `import SwiftUI

@main
struct TennisTrackerWatchApp: App {
    @StateObject private var connectivity = WatchConnectivityManager.shared
    @StateObject private var motionManager = TennisMotionManager()

    var body: some Scene {
        WindowGroup {
            WatchRootView()
                .environmentObject(connectivity)
                .environmentObject(motionManager)
        }
    }
}

enum WatchScreen {
    case splash
    case mainMenu
    case strokesMenu
    case collecting(StrokeType)
    case playing
}

enum StrokeType: String, CaseIterable, Codable {
    case forehand = "Forehand"
    case backhand = "Backhand"
    case saque = "Saque"
}

struct WatchRootView: View {
    @EnvironmentObject var connectivity: WatchConnectivityManager
    @EnvironmentObject var motionManager: TennisMotionManager
    @State private var screen: WatchScreen = .splash

    var body: some View {
        Group {
            switch screen {
            case .splash:
                WatchSplashView {
                    screen = connectivity.isDataCollectionEnabled ? .mainMenu : .playing
                }
            case .mainMenu:
                WatchMainMenuView(
                    onSelectCollect: { screen = .strokesMenu },
                    onSelectPlay: { screen = .playing },
                    onClose: { screen = .splash }
                )
            case .strokesMenu:
                WatchStrokesMenuView(
                    onSelectStroke: { stroke in screen = .collecting(stroke) },
                    onClose: { screen = .mainMenu }
                )
            case .collecting(let stroke):
                WatchCollectingView(stroke: stroke) {
                    screen = .strokesMenu
                }
            case .playing:
                WatchPlayingView(
                    showCloseButton: connectivity.isDataCollectionEnabled,
                    onFinish: {
                        screen = connectivity.isDataCollectionEnabled ? .mainMenu : .splash
                    }
                )
            }
        }
        .onChange(of: connectivity.sessionResetTrigger) { _ in
            motionManager.resetLiveMatch()
            screen = .playing
        }
    }
}`
  },
  {
    id: 'watch-views',
    platform: 'watchOS',
    filename: 'WatchWorkoutViews.swift',
    subtitle: 'Telas SwiftUI do Apple Watch (Coleta CoreMotion 100Hz e Partida ao Vivo)',
    code: `import SwiftUI
import CoreMotion

struct WatchSplashView: View {
    let onStart: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Spacer()
            Image("tennis-icone3-saque")
                .resizable()
                .scaledToFill()
                .frame(width: 96, height: 96)
                .clipShape(Circle())
                .overlay(Circle().stroke(Color(hex: "a3e635"), lineWidth: 2))
            Spacer()
            Button(action: onStart) {
                Text("INICIAR")
                    .font(.system(size: 22, weight: .black))
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color(hex: "a3e635"))
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding()
        .background(Color.black)
    }
}

struct WatchPlayingView: View {
    @EnvironmentObject var motionManager: TennisMotionManager
    @EnvironmentObject var connectivity: WatchConnectivityManager

    let showCloseButton: Bool
    let onFinish: () -> Void

    @State private var elapsedSeconds: Int = 0
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                if showCloseButton {
                    Button(action: onFinish) {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 26, height: 26)
                            .background(Color.red)
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
                Text("● DETECTANDO")
                    .font(.system(size: 14, weight: .black, design: .monospaced))
                    .foregroundColor(.green)
            }

            Text("TEMPO DE PARTIDA: \\(formatDuration(elapsedSeconds))")
                .font(.system(size: 20, weight: .black))
                .foregroundColor(.white)
                .minimumScaleFactor(0.8)

            VStack(spacing: 6) {
                StrokeCounterRow(title: "FOREHAND", count: motionManager.detectedForehand, color: .green)
                StrokeCounterRow(title: "BACKHAND", count: motionManager.detectedBackhand, color: .blue)
                StrokeCounterRow(title: "SAQUE", count: motionManager.detectedSaque, color: .orange)
            }

            Button(action: {
                motionManager.stopDetection()
                onFinish()
            }) {
                Text("FINALIZAR PARTIDA")
                    .font(.system(size: 17, weight: .black))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color(white: 0.2))
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 6)
        .background(Color.black)
        .onAppear {
            elapsedSeconds = 0
            motionManager.startLiveDetection { stroke in
                connectivity.sendDetectedStroke(stroke)
            }
        }
        .onReceive(timer) { _ in
            elapsedSeconds += 1
        }
    }

    private func formatDuration(_ sec: Int) -> String {
        String(format: "%02d:%02d", sec / 60, sec % 60)
    }
}

struct StrokeCounterRow: View {
    let title: String
    let count: Int
    let color: Color

    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 24, weight: .black))
            Spacer()
            Text("\\(count)")
                .font(.system(size: 32, weight: .black, design: .monospaced))
        }
        .foregroundColor(.white)
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(color)
        .clipShape(Capsule())
    }
}`
  },
  {
    id: 'watch-connectivity',
    platform: 'watchOS',
    filename: 'WatchConnectivityManager.swift',
    subtitle: 'Comunicação WatchConnectivity + CoreMotion 100Hz no Watch',
    code: `import Foundation
import WatchConnectivity
import CoreMotion

final class WatchConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchConnectivityManager()

    @Published var isDataCollectionEnabled: Bool = UserDefaults.standard.bool(forKey: "dataCollectionEnabled")
    @Published var sessionResetTrigger = UUID()

    private override init() {
        super.init()
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }

    func sendDetectedStroke(_ stroke: StrokeType) {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage([
            "event": "strokeDetected",
            "strokeType": stroke.rawValue,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ], replyHandler: nil)
    }

    func sendTrainingCapture(stroke: StrokeType, samples: [[String: Double]], peakForce: Double) {
        let payload: [String: Any] = [
            "event": "trainingCapture",
            "strokeType": stroke.rawValue,
            "samplesCount": samples.count,
            "peakForce": peakForce,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]
        WCSession.default.transferUserInfo(payload)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        DispatchQueue.main.async {
            if let enabled = message["isDataCollectionEnabled"] as? Bool {
                self.isDataCollectionEnabled = enabled
                UserDefaults.standard.set(enabled, forKey: "dataCollectionEnabled")
            }
            if message["command"] as? String == "startNewSession" {
                self.sessionResetTrigger = UUID()
            }
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
}

final class TennisMotionManager: ObservableObject {
    private let motion = CMMotionManager()
    @Published var detectedForehand = 0
    @Published var detectedBackhand = 0
    @Published var detectedSaque = 0

    func startLiveDetection(onDetect: @escaping (StrokeType) -> Void) {
        guard motion.isDeviceMotionAvailable else { return }
        motion.deviceMotionUpdateInterval = 1.0 / 100.0 // 100 Hz
        motion.startDeviceMotionUpdates(to: .main) { [weak self] data, _ in
            guard let self = self, let accel = data?.userAcceleration else { return }
            let magnitude = sqrt(pow(accel.x, 2) + pow(accel.y, 2) + pow(accel.z, 2))
            if magnitude > 4.2 {
                // Classificação via CoreML (CreateML TennisClassifier)
                let stroke: StrokeType = accel.z > 2.5 ? .saque : (accel.x > 0 ? .forehand : .backhand)
                switch stroke {
                case .forehand: self.detectedForehand += 1
                case .backhand: self.detectedBackhand += 1
                case .saque: self.detectedSaque += 1
                }
                onDetect(stroke)
            }
        }
    }

    func stopDetection() {
        motion.stopDeviceMotionUpdates()
    }

    func resetLiveMatch() {
        detectedForehand = 0
        detectedBackhand = 0
        detectedSaque = 0
    }
}`
  },
  {
    id: 'ios-main',
    platform: 'iOS',
    filename: 'TennisTrackerMainView.swift',
    subtitle: 'Tela principal do iPhone: Resumo pós-sessão, Mapa GPS da Quadra, Câmera e Iniciar Sessão',
    code: `import SwiftUI
import MapKit
import PhotosUI

struct TennisTrackerMainView: View {
    @StateObject private var store = TennisTrackerStore()
    @StateObject private var locationManager = LocationCourtManager()

    @State private var showProfileSheet = false
    @State private var showSettingsSheet = false
    @State private var showCamera = false
    @State private var capturedTodayImage: UIImage?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header: Ícone + Nome + Avatar Circular do Jogador
                HStack(spacing: 10) {
                    Image("tennis-icone3-saque")
                        .resizable()
                        .frame(width: 38, height: 38)
                        .cornerRadius(10)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("TENNIS TRACKER")
                            .font(.system(size: 17, weight: .black))
                        Text("Detector de jogada e análise de movimentos")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Button(action: { showProfileSheet = true }) {
                        ProfileAvatarView(image: store.profileImage, initials: store.userNameInitials)
                            .frame(width: 40, height: 40)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(Color.green, lineWidth: 2))
                    }
                }
                .padding()
                .background(Color(.systemBackground))

                ScrollView {
                    VStack(spacing: 14) {
                        // Ao finalizar sessão no Watch, exibe Tempo Decorrido + Placar 2x2 no topo
                        if store.hasFinishedSession {
                            VStack(spacing: 10) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("SESSÃO FINALIZADA")
                                            .font(.caption2.bold())
                                            .foregroundColor(.green)
                                        Text("Tempo decorrido da sessão")
                                            .font(.caption.bold())
                                            .foregroundColor(.white.opacity(0.85))
                                    }
                                    Spacer()
                                    Text(store.formattedElapsedDuration)
                                        .font(.system(size: 24, weight: .black, design: .monospaced))
                                        .foregroundColor(Color(red: 0.64, green: 0.90, blue: 0.21))
                                }
                                .padding()
                                .background(Color.black)
                                .cornerRadius(14)

                                Scoreboard2x2View(store: store)
                            }
                        }

                        // 1 - Detecção da Quadra (com resumo do Mapa GPS)
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Label("1. Detecção da Quadra", systemImage: "location.fill")
                                    .font(.caption.bold())
                                Spacer()
                                if locationManager.matchedAutomatically {
                                    Text("Detectada via GPS")
                                        .font(.caption2.bold())
                                        .foregroundColor(.green)
                                }
                            }

                            if let court = store.selectedCourt {
                                Map(initialPosition: .region(MKCoordinateRegion(
                                    center: CLLocationCoordinate2D(latitude: court.latitude, longitude: court.longitude),
                                    span: MKCoordinateSpan(latitudeDelta: 0.005, longitudeDelta: 0.005)
                                ))) {
                                    Marker(court.name, coordinate: CLLocationCoordinate2D(latitude: court.latitude, longitude: court.longitude))
                                }
                                .frame(height: 100)
                                .cornerRadius(12)
                            }

                            Picker("Quadra", selection: $store.selectedCourtId) {
                                ForEach(store.courts) { court in
                                    Text(court.name).tag(court.id)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(14)

                        // 2 - Foto da Quadra / Abrir Câmera
                        VStack(alignment: .leading, spacing: 8) {
                            Label("2. Foto da Quadra", systemImage: "camera.fill")
                                .font(.caption.bold())

                            Button(action: { showCamera = true }) {
                                Label("Abrir Câmera e Tirar Foto", systemImage: "camera.fill")
                                    .font(.subheadline.bold())
                                    .frame(maxWidth: .infinity)
                                    .padding(12)
                                    .background(Color.blue)
                                    .foregroundColor(.white)
                                    .cornerRadius(12)
                            }

                            if let image = capturedTodayImage {
                                Image(uiImage: image)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(height: 140)
                                    .clipped()
                                    .cornerRadius(12)
                            }
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(14)

                        // 3 - Iniciar Nova Sessão (Partida ao vivo)
                        Button(action: { store.startNewLiveSession() }) {
                            Label("3. Iniciar Nova Sessão", systemImage: "arrow.clockwise.circle.fill")
                                .font(.headline.bold())
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.black)
                                .cornerRadius(14)
                        }

                        if !store.hasFinishedSession {
                            Scoreboard2x2View(store: store)
                        }
                    }
                    .padding()
                }

                // Rodapé com Botão de Configurações (Coleta & Histórico de Treinamento)
                HStack {
                    Button(action: { showSettingsSheet = true }) {
                        Label("Configurações & Treinamento", systemImage: "gearshape.fill")
                            .font(.subheadline.bold())
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                }
                .background(.ultraThinMaterial)
                .overlay(Divider(), alignment: .top)
            }
            .onAppear {
                locationManager.detectNearestCourt(from: store.courts) { matchedId in
                    if let matchedId { store.selectedCourtId = matchedId }
                }
            }
            .sheet(isPresented: $showProfileSheet) {
                PlayerProfileEditorSheet(store: store, locationManager: locationManager)
            }
            .sheet(isPresented: $showSettingsSheet) {
                TrainingSettingsSheet(store: store)
            }
            .sheet(isPresented: $showCamera) {
                CameraPickerView(image: $capturedTodayImage)
            }
        }
    }
}`
  },
  {
    id: 'ios-location-connectivity',
    platform: 'iOS',
    filename: 'LocationAndPhoneConnectivity.swift',
    subtitle: 'Geolocalização CoreLocation das quadras + WCSession + Edição de Treinos',
    code: `import Foundation
import CoreLocation
import WatchConnectivity

struct TennisCourt: Identifiable, Codable {
    var id = UUID()
    var name: String
    var latitude: Double
    var longitude: Double
    var radiusMeters: Double = 300
}

struct TrainingCaptureItem: Identifiable, Codable {
    var id = UUID()
    var strokeType: StrokeType
    var attemptNumber: Int
    var timestamp: Date
    var peakForce: Double
    var isEnabled: Bool = true
}

final class LocationCourtManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    @Published var currentLocation: CLLocation?
    @Published var matchedAutomatically = false

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.requestWhenInUseAuthorization()
        manager.startUpdatingLocation()
    }

    func detectNearestCourt(from courts: [TennisCourt], onMatch: (UUID?) -> Void) {
        guard let loc = currentLocation ?? manager.location else {
            onMatch(nil)
            return
        }
        for court in courts {
            let courtLoc = CLLocation(latitude: court.latitude, longitude: court.longitude)
            if loc.distance(from: courtLoc) <= court.radiusMeters {
                matchedAutomatically = true
                onMatch(court.id)
                return
            }
        }
        matchedAutomatically = false
        onMatch(nil)
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        currentLocation = locations.last
    }
}

final class TennisTrackerStore: NSObject, ObservableObject, WCSessionDelegate {
    @Published var userName = "Eduardo Natario"
    @Published var userEmail = "eduardonatario@gmail.com"
    @Published var courts: [TennisCourt] = []
    @Published var selectedCourtId: UUID = UUID()
    @Published var trainingHistory: [TrainingCaptureItem] = []

    @Published var liveForehand = 0
    @Published var liveBackhand = 0
    @Published var liveSaque = 0
    @Published var elapsedSeconds = 0
    @Published var hasFinishedSession = false
    var liveTotal: Int { liveForehand + liveBackhand + liveSaque }
    var selectedCourt: TennisCourt? { courts.first(where: { $0.id == selectedCourtId }) ?? courts.first }
    var formattedElapsedDuration: String {
        String(format: "%02d:%02d", elapsedSeconds / 60, elapsedSeconds % 60)
    }

    @Published var isDataCollectionEnabled: Bool = UserDefaults.standard.bool(forKey: "dataCollectionEnabled") {
        didSet {
            UserDefaults.standard.set(isDataCollectionEnabled, forKey: "dataCollectionEnabled")
            sendWatchConfig(["isDataCollectionEnabled": isDataCollectionEnabled])
        }
    }

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    func startNewLiveSession() {
        liveForehand = 0
        liveBackhand = 0
        liveSaque = 0
        elapsedSeconds = 0
        hasFinishedSession = false
        sendWatchConfig(["command": "startNewSession"])
    }

    func keepOnlyNewestTrainingData() {
        let sorted = trainingHistory.sorted { $0.timestamp > $1.timestamp }
        for idx in sorted.indices {
            if let indexInStore = trainingHistory.firstIndex(where: { $0.id == sorted[idx].id }) {
                trainingHistory[indexInStore].isEnabled = idx < 5
            }
        }
    }

    private func sendWatchConfig(_ payload: [String: Any]) {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(payload, replyHandler: nil)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        DispatchQueue.main.async {
            if message["event"] as? String == "strokeDetected",
               let raw = message["strokeType"] as? String,
               let stroke = StrokeType(rawValue: raw) {
                switch stroke {
                case .forehand: self.liveForehand += 1
                case .backhand: self.liveBackhand += 1
                case .saque: self.liveSaque += 1
                }
            }
            if message["event"] as? String == "sessionFinished" {
                if let duration = message["elapsedSeconds"] as? Int {
                    self.elapsedSeconds = duration
                }
                self.hasFinishedSession = true
            }
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) { WCSession.default.activate() }
}`
  }
];

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tablecall.staff',
  appName: 'TableCall Staff',
  // webDir คือโฟลเดอร์ที่ vite build ออกมา
  webDir: 'dist',
  server: {
    // ระหว่าง development ให้ชี้มาที่ dev server
    // comment บรรทัดนี้ออกเมื่อ build production APK
    // url: 'http://192.168.1.x:5173',
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    // ==========================================
    // Firebase Cloud Messaging — Push Notification
    // ==========================================
    FirebaseMessaging: {
      presentationOptions: ["badge", "sound", "alert"],
      // presentationOptions ใช้สำหรับ iOS เท่านั้น
      // Android จะใช้ notification channel แทน
    },
    // ==========================================
    // SplashScreen
    // ==========================================
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0f0f0f',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    // ==========================================
    // StatusBar — ให้ match กับ dark theme
    // ==========================================
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f0f0f',
    },
  },
  android: {
    // minSdkVersion 26 = Android 8.0+ (รองรับ FCM notification channel)
    minWebViewVersion: 60,
    // ปิด mixed content (ห้าม HTTP ใน HTTPS app)
    allowMixedContent: false,
    // captureInput = รองรับ keyboard บน WebView ได้ดีขึ้น
    captureInput: true,
    // webContentsDebuggingEnabled = true ระหว่าง dev เท่านั้น
    webContentsDebuggingEnabled: false,
  },
};

export default config;

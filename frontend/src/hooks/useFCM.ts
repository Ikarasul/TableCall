import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

export default function useFCM() {
  const token = useAuthStore((state) => state.token)

  useEffect(() => {
    if (!token) return

    // รันเฉพาะบนอุปกรณ์ Android/iOS เท่านั้น (ไม่รันบนเว็บ)
    if (!Capacitor.isNativePlatform()) return

    const registerFCM = async () => {
      try {
        // ขออนุญาตแจ้งเตือน
        const result = await FirebaseMessaging.requestPermissions()
        if (result.receive === 'granted') {
          // ดึง Token ของเครื่อง
          const fcmResponse = await FirebaseMessaging.getToken()
          const deviceToken = fcmResponse.token

          console.log('[FCM] Device Token:', deviceToken)

          // ส่งไปให้ Backend
          await api.post('/v1/staff/device-token/', {
            fcm_token: deviceToken
          })
          
          console.log('[FCM] Token sent to backend successfully')
        } else {
          console.log('[FCM] Permission denied')
        }
      } catch (error) {
        console.error('[FCM] Registration Error:', error)
      }
    }

    registerFCM()
    
    // Listen for push notifications in foreground
    FirebaseMessaging.addListener('notificationReceived', (event) => {
      console.log('[FCM] Push Notification Received:', event)
    })

    return () => {
      FirebaseMessaging.removeAllListeners()
    }
  }, [token])
}

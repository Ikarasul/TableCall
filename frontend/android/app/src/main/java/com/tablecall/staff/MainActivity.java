package com.tablecall.staff;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.media.RingtoneManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // สร้าง Notification Channel สำหรับระบบเรียกพนักงาน
            NotificationChannel channel = new NotificationChannel(
                "tablecall_alerts",
                "การแจ้งเตือนเรียกพนักงาน",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("แจ้งเตือนเมื่อโต๊ะลูกค้าต้องการความช่วยเหลือ");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            channel.enableLights(true);

            // ใช้เสียงนาฬิกาปลุก (Alarm) แทนเสียง notification ปกติ
            Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            // fallback to notification if alarm is null
            if (alarmSound == null) {
                alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_ALARM)
                .build();
            channel.setSound(alarmSound, audioAttributes);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}

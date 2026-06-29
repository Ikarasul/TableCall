"""
notifications/models.py
=======================
Models สำหรับระบบแจ้งเตือน (Notification)

- Notification: บันทึกการเรียกพนักงานจากลูกค้า
  - kind: 'call' (เรียกพนักงาน) หรือ 'bill' (เรียกเก็บเงิน)
  - status: 'pending' (รอ) หรือ 'handled' (จัดการแล้ว)
  - Data retention: 90 วัน (ใช้ cleanup_old())

- NotificationManager: custom manager พร้อม cleanup_old()
"""

from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.conf import settings


class NotificationQuerySet(models.QuerySet):
    """Custom QuerySet สำหรับ Notification"""

    def pending(self):
        """Filter เฉพาะ notification ที่ยังรอ"""
        return self.filter(status='pending')

    def handled(self):
        """Filter เฉพาะ notification ที่จัดการแล้ว"""
        return self.filter(status='handled')

    def for_table(self, table):
        """Filter notification ของโต๊ะที่ระบุ"""
        return self.filter(table=table)

    def cleanup_old(self) -> int:
        """
        ลบ notification ที่เก่ากว่า NOTIFICATION_RETENTION_DAYS วัน
        คืน จำนวน record ที่ลบ
        
        ใช้ settings.NOTIFICATION_RETENTION_DAYS (default: 90)
        """
        retention_days = getattr(settings, 'NOTIFICATION_RETENTION_DAYS', 90)
        cutoff_date = timezone.now() - timedelta(days=retention_days)
        old_notifications = self.filter(created_at__lt=cutoff_date)
        count, _ = old_notifications.delete()
        return count


class NotificationManager(models.Manager):
    """Custom Manager ที่ใช้ NotificationQuerySet"""

    def get_queryset(self):
        return NotificationQuerySet(self.model, using=self._db)

    def pending(self):
        return self.get_queryset().pending()

    def cleanup_old(self) -> int:
        """ลบ notification เก่าเกิน 90 วัน"""
        return self.get_queryset().cleanup_old()


class Notification(models.Model):
    """
    บันทึกการแจ้งเตือนจากลูกค้า

    Flow: ลูกค้าสแกน QR → POST /api/tables/<qr_token>/notify/
         → สร้าง Notification (status=pending)
         → Staff กด handle → status=handled
    """

    KIND_CALL = 'call'
    KIND_BILL = 'bill'
    KIND_CHOICES = [
        (KIND_CALL, 'เรียกพนักงาน'),
        (KIND_BILL, 'เรียกเก็บเงิน'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_HANDLED = 'handled'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'รอการจัดการ'),
        (STATUS_HANDLED, 'จัดการแล้ว'),
    ]

    table = models.ForeignKey(
        'tables.RestaurantTable',
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='โต๊ะ'
    )
    kind = models.CharField(
        max_length=10,
        choices=KIND_CHOICES,
        verbose_name='ประเภท'
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        verbose_name='สถานะ',
        db_index=True  # Index สำหรับ filter status=pending บ่อย
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='เวลาที่สร้าง',
        db_index=True  # Index สำหรับ cleanup_old() และ retention query
    )
    handled_by = models.ForeignKey(
        'staff.Staff',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='handled_notifications',
        verbose_name='พนักงานที่จัดการ'
    )
    handled_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='เวลาที่จัดการ'
    )

    # Custom manager
    objects = NotificationManager()

    class Meta:
        verbose_name = 'การแจ้งเตือน'
        verbose_name_plural = 'การแจ้งเตือนทั้งหมด'
        ordering = ['-created_at']
        indexes = [
            # Composite index สำหรับ query บ่อย: filter pending + order by created_at
            models.Index(fields=['status', '-created_at'], name='idx_notif_status_created'),
            # Index สำหรับ cleanup_old()
            models.Index(fields=['created_at'], name='idx_notification_created'),
        ]

    def __str__(self):
        return (
            f'[{self.get_kind_display()}] โต๊ะ {self.table.number} '
            f'({self.get_status_display()}) @ {self.created_at:%Y-%m-%d %H:%M}'
        )

    def mark_handled(self, staff) -> None:
        """
        Mark notification ว่าจัดการแล้ว
        เรียกใน notification handle view พร้อม select_for_update()
        """
        self.status = self.STATUS_HANDLED
        self.handled_by = staff
        self.handled_at = timezone.now()
        self.save(update_fields=['status', 'handled_by', 'handled_at'])

    @property
    def response_time_seconds(self) -> int | None:
        """เวลาตอบสนอง (วินาที) จาก created_at ถึง handled_at"""
        if self.handled_at and self.created_at:
            return int((self.handled_at - self.created_at).total_seconds())
        return None

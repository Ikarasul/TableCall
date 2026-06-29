"""
staff/models.py
===============
Models สำหรับระบบพนักงาน (Staff) ของ TableCall
- Staff: ข้อมูลพนักงาน + PIN hash
- ShiftLog: บันทึกเวลาเข้า-ออกงาน
- StaffDevice: FCM token สำหรับ push notification
"""

import uuid
from django.db import models
from django.contrib.auth.hashers import make_password, check_password as django_check_password
from django.utils import timezone


class Staff(models.Model):
    """
    โมเดลพนักงาน
    - code: รหัสพนักงาน (unique, ใช้ login)
    - pin_hash: PIN ที่ hash แล้วด้วย Django's make_password
    - avatar_emoji: emoji แทนรูปโปรไฟล์ (ง่ายกว่า upload รูป)
    """
    code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='รหัสพนักงาน',
        help_text='รหัสพนักงานที่ unique เช่น EMP001'
    )
    name = models.CharField(
        max_length=100,
        verbose_name='ชื่อพนักงาน'
    )
    password_hash = models.CharField(
        max_length=255,
        verbose_name='Password (hashed)',
        help_text='เก็บ Password ในรูปแบบ hash โดยใช้ make_password()'
    )
    avatar_emoji = models.CharField(
        max_length=10,
        default='👤',
        verbose_name='Avatar Emoji'
    )
    role = models.CharField(
        max_length=20,
        choices=[('admin', 'ผู้ดูแลระบบ'), ('staff', 'พนักงานทั่วไป')],
        default='staff',
        verbose_name='ระดับสิทธิ์'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='ใช้งานอยู่'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'พนักงาน'
        verbose_name_plural = 'พนักงานทั้งหมด'
        ordering = ['code']

    def __str__(self):
        return f'{self.code} - {self.name}'

    def set_password(self, raw_password: str) -> None:
        """Hash และบันทึก Password ใหม่"""
        self.password_hash = make_password(str(raw_password))

    def verify_password(self, raw_password: str) -> bool:
        """ตรวจสอบ Password ที่กรอกกับ hash ที่เก็บไว้"""
        return django_check_password(str(raw_password), self.password_hash)

    @property
    def is_authenticated(self):
        """สำหรับให้เข้ากันได้กับ DRF permission classes"""
        return True


class ShiftLog(models.Model):
    """
    บันทึกการเข้า-ออกงานของพนักงาน
    - clock_in: เวลาเข้างาน (auto ตอน create)
    - clock_out: เวลาออกงาน (null ถ้ายังไม่ออก)
    """
    staff = models.ForeignKey(
        Staff,
        on_delete=models.CASCADE,
        related_name='shift_logs',
        verbose_name='พนักงาน'
    )
    clock_in = models.DateTimeField(
        default=timezone.now,
        verbose_name='เวลาเข้างาน'
    )
    clock_out = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='เวลาออกงาน'
    )

    class Meta:
        verbose_name = 'บันทึกกะงาน'
        verbose_name_plural = 'บันทึกกะงานทั้งหมด'
        ordering = ['-clock_in']
        # Index สำหรับ query หา active shift
        indexes = [
            models.Index(fields=['staff', '-clock_in']),
            models.Index(fields=['clock_out']),
        ]

    def __str__(self):
        return f'{self.staff.name} | in: {self.clock_in} | out: {self.clock_out}'

    @property
    def duration_minutes(self) -> int | None:
        """คำนวณระยะเวลาทำงาน (นาที), None ถ้ายังไม่ออกงาน"""
        if self.clock_out:
            delta = self.clock_out - self.clock_in
            return int(delta.total_seconds() / 60)
        return None

    @property
    def is_active_shift(self) -> bool:
        """True ถ้ากะนี้ยังไม่สิ้นสุด"""
        return self.clock_out is None


class StaffDevice(models.Model):
    """
    เก็บ FCM Token ของ device พนักงาน
    สำหรับส่ง push notification เมื่อลูกค้าเรียก
    - one Staff → one Device (one-to-one)
    """
    staff = models.OneToOneField(
        Staff,
        on_delete=models.CASCADE,
        related_name='device',
        verbose_name='พนักงาน'
    )
    fcm_token = models.TextField(
        verbose_name='FCM Token',
        help_text='Firebase Cloud Messaging token ของ device'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='อัปเดตล่าสุด'
    )

    class Meta:
        verbose_name = 'อุปกรณ์พนักงาน'
        verbose_name_plural = 'อุปกรณ์พนักงานทั้งหมด'

    def __str__(self):
        return f'Device of {self.staff.name} (updated: {self.updated_at:%Y-%m-%d %H:%M})'

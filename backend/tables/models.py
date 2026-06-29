"""
tables/models.py
================
Models สำหรับโต๊ะอาหาร (RestaurantTable)
- qr_token: UUID-based token ที่ใช้ใน QR Code
  ลูกค้าสแกน QR → เรียก /api/tables/<qr_token>/notify/
"""

import uuid
from django.db import models


class RestaurantTable(models.Model):
    """
    โมเดลโต๊ะอาหาร
    - number: หมายเลขโต๊ะ (แสดงในระบบ)
    - seats: จำนวนที่นั่ง
    - qr_token: UUID สำหรับ QR Code (auto-generated, immutable)
    - is_active: เปิด/ปิดโต๊ะ
    """
    number = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='หมายเลขโต๊ะ',
        help_text='เช่น A1, B2, 01, VIP1'
    )
    seats = models.PositiveSmallIntegerField(
        default=4,
        verbose_name='จำนวนที่นั่ง'
    )
    qr_token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,  # ไม่ให้แก้ไข token หลังสร้าง
        verbose_name='QR Token',
        help_text='UUID สำหรับสร้าง QR Code, auto-generated'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='เปิดใช้งาน'
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        verbose_name='ลำดับจัดเรียง'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'โต๊ะอาหาร'
        verbose_name_plural = 'โต๊ะอาหารทั้งหมด'
        ordering = ['sort_order', 'number']

    def __str__(self):
        return f'Table {self.number} ({self.seats} seats)'

    def get_qr_token_str(self) -> str:
        """คืน qr_token เป็น string (ไม่มีขีดกลาง)"""
        return str(self.qr_token).replace('-', '')

    @property
    def pending_notifications_count(self) -> int:
        """จำนวน notification ที่ยัง pending ของโต๊ะนี้"""
        return self.notifications.filter(status='pending').count()

class CustomerFeedback(models.Model):
    """
    โมเดลสำหรับเก็บข้อมูลความพึงพอใจและข้อเสนอแนะจากลูกค้า
    """
    table = models.ForeignKey(
        RestaurantTable,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedbacks',
        verbose_name='โต๊ะ'
    )
    rating = models.PositiveSmallIntegerField(
        verbose_name='คะแนนความพึงพอใจ',
        help_text='1-5 ดาว'
    )
    suggestions = models.TextField(
        blank=True,
        verbose_name='ข้อเสนอแนะเพิ่มเติม'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'ข้อเสนอแนะ'
        verbose_name_plural = 'ข้อเสนอแนะทั้งหมด'
        ordering = ['-created_at']

    def __str__(self):
        table_str = f"Table {self.table.number}" if self.table else "Unknown Table"
        return f'{table_str} - {self.rating} Stars'

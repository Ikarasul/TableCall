"""
notifications/management/commands/cleanup_notifications.py
==========================================================
Django Management Command สำหรับลบ Notification เก่าเกิน 90 วัน

ใช้งาน:
    python manage.py cleanup_notifications
    python manage.py cleanup_notifications --dry-run    (ดูก่อนลบ)
    python manage.py cleanup_notifications --days 60    (override retention)

ตั้งเวลาใน cron (daily):
    0 2 * * * /path/to/venv/bin/python /app/manage.py cleanup_notifications
"""

import logging
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import timedelta
from django.conf import settings

logger = logging.getLogger('tablecall')


class Command(BaseCommand):
    """
    Management Command: cleanup_notifications
    ลบ Notification records ที่เก่าเกิน retention period (default 90 วัน)
    """
    help = 'ลบ Notification เก่าเกิน retention period (default 90 วัน)'

    def add_arguments(self, parser):
        """เพิ่ม CLI arguments"""
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=False,
            help='แสดงจำนวนที่จะลบโดยไม่ลบจริง (preview mode)',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=None,
            help=(
                f'Override จำนวนวัน retention (default จาก settings: '
                f'{getattr(settings, "NOTIFICATION_RETENTION_DAYS", 90)} วัน)'
            ),
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='จำนวน records ที่ลบต่อ batch (default: 1000)',
        )

    def handle(self, *args, **options):
        """
        Main logic สำหรับ cleanup
        """
        # ดึง retention days จาก argument หรือ settings
        retention_days = options['days'] or getattr(
            settings, 'NOTIFICATION_RETENTION_DAYS', 90
        )
        dry_run = options['dry_run']
        batch_size = options['batch_size']

        cutoff_date = timezone.now() - timedelta(days=retention_days)

        self.stdout.write(
            self.style.HTTP_INFO(
                f'\n{"=" * 60}\n'
                f'TableCall Notification Cleanup\n'
                f'{"=" * 60}'
            )
        )
        self.stdout.write(f'Retention period : {retention_days} วัน')
        self.stdout.write(f'Cutoff date      : {cutoff_date.strftime("%Y-%m-%d %H:%M:%S")} (Asia/Bangkok)')
        self.stdout.write(f'Dry run          : {"Yes" if dry_run else "No"}')
        self.stdout.write(f'Batch size       : {batch_size}\n')

        # Import ที่นี่เพื่อหลีกเลี่ยง import error ตอน collect
        from notifications.models import Notification

        # นับ records ที่จะถูกลบ
        old_notifications = Notification.objects.filter(created_at__lt=cutoff_date)
        total_count = old_notifications.count()

        if total_count == 0:
            self.stdout.write(
                self.style.SUCCESS('✓ ไม่มี notification เก่าที่ต้องลบ')
            )
            return

        self.stdout.write(f'พบ notification เก่า: {total_count:,} records')

        # แสดง breakdown by status
        pending_count = old_notifications.filter(status='pending').count()
        handled_count = old_notifications.filter(status='handled').count()
        self.stdout.write(f'  - pending : {pending_count:,} records')
        self.stdout.write(f'  - handled : {handled_count:,} records')

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'\n[DRY RUN] จะลบ {total_count:,} records '
                    f'(ไม่ได้ลบจริง เพราะใช้ --dry-run)'
                )
            )
            return

        # ยืนยันก่อนลบ (ถ้ามีจำนวนมาก)
        if total_count > 10000:
            self.stdout.write(
                self.style.WARNING(
                    f'⚠️  จะลบ records จำนวนมาก ({total_count:,}) '
                    f'อาจใช้เวลาสักครู่...'
                )
            )

        # ลบแบบ batch เพื่อไม่ให้ lock table นานเกินไป
        deleted_total = 0
        batch_num = 0

        try:
            while True:
                # ดึง IDs ของ batch นี้
                batch_ids = list(
                    Notification.objects.filter(created_at__lt=cutoff_date)
                    .values_list('id', flat=True)[:batch_size]
                )

                if not batch_ids:
                    break  # ไม่มีอีกแล้ว

                # ลบเฉพาะ batch นี้
                deleted_count, _ = (
                    Notification.objects.filter(id__in=batch_ids).delete()
                )
                deleted_total += deleted_count
                batch_num += 1

                self.stdout.write(
                    f'  Batch {batch_num}: ลบแล้ว {deleted_count} records '
                    f'(รวม {deleted_total:,}/{total_count:,})'
                )

        except Exception as e:
            logger.error(f'cleanup_notifications error: {e}')
            raise CommandError(f'เกิดข้อผิดพลาดในการลบ: {e}')

        # สรุปผล
        self.stdout.write(
            self.style.SUCCESS(
                f'\n{"=" * 60}\n'
                f'✓ ลบ notification เก่า {deleted_total:,} records เรียบร้อย\n'
                f'  Retention: {retention_days} วัน | '
                f'Cutoff: {cutoff_date.strftime("%Y-%m-%d")}\n'
                f'{"=" * 60}'
            )
        )

        logger.info(
            f'cleanup_notifications completed: deleted {deleted_total} records '
            f'older than {retention_days} days (cutoff: {cutoff_date.date()})'
        )

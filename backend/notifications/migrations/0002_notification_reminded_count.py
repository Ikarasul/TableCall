# Generated for adding reminded_count field to Notification

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='reminded_count',
            field=models.PositiveSmallIntegerField(default=0, verbose_name='จำนวนครั้งที่ส่ง reminder'),
        ),
    ]

"""
resize_icons.py — แปลงรูปโลโก้เป็น Android icon ทุกขนาด
"""
from PIL import Image
import os
import shutil

# Source image path
SRC = os.path.join(os.path.dirname(__file__), "logo_source.jpg")
BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "android", "app", "src", "main", "res")

# (folder, size)
MIPMAP_SIZES = [
    ("mipmap-mdpi",    48),
    ("mipmap-hdpi",    72),
    ("mipmap-xhdpi",   96),
    ("mipmap-xxhdpi",  144),
    ("mipmap-xxxhdpi", 192),
]

# Splash screen sizes (landscape + portrait)
SPLASH_SIZES = [
    ("drawable-land-mdpi",    480,  320),
    ("drawable-land-hdpi",    800,  480),
    ("drawable-land-xhdpi",   1280, 720),
    ("drawable-land-xxhdpi",  1600, 960),
    ("drawable-land-xxxhdpi", 1920, 1280),
    ("drawable-port-mdpi",    320,  480),
    ("drawable-port-hdpi",    480,  800),
    ("drawable-port-xhdpi",   720,  1280),
    ("drawable-port-xxhdpi",  960,  1600),
    ("drawable-port-xxxhdpi", 1280, 1920),
    ("drawable",              1024, 1024),
]

img = Image.open(SRC).convert("RGBA")

# สร้าง mipmap icons
for folder, size in MIPMAP_SIZES:
    out_dir = os.path.join(BASE, folder)
    os.makedirs(out_dir, exist_ok=True)
    
    resized = img.resize((size, size), Image.LANCZOS)
    
    # ic_launcher.png
    resized.save(os.path.join(out_dir, "ic_launcher.png"), "PNG")
    # ic_launcher_round.png
    resized.save(os.path.join(out_dir, "ic_launcher_round.png"), "PNG")
    # ic_launcher_foreground.png (ใช้รูปเดิมเป็น foreground layer)
    resized.save(os.path.join(out_dir, "ic_launcher_foreground.png"), "PNG")
    
    print(f"✅ {folder}: {size}x{size}")

# สร้าง splash screens (ใส่โลโก้กลางพื้นดำ)
for folder, w, h in SPLASH_SIZES:
    out_dir = os.path.join(BASE, folder)
    os.makedirs(out_dir, exist_ok=True)
    
    # พื้นดำ
    splash = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    # โลโก้ขนาด 40% ของด้านสั้น
    logo_size = int(min(w, h) * 0.4)
    logo = img.resize((logo_size, logo_size), Image.LANCZOS)
    # วางกลาง
    x = (w - logo_size) // 2
    y = (h - logo_size) // 2
    splash.paste(logo, (x, y), logo)
    
    splash.convert("RGB").save(os.path.join(out_dir, "splash.png"), "PNG")
    print(f"✅ {folder}: splash {w}x{h}")

print("\n🎉 ไอคอนทั้งหมดสร้างเสร็จแล้วครับ!")

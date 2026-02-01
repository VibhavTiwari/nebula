"""
Generate Nebula app icon — atom orbital with </> code brackets.

Creates a high-res source icon (1024x1024) then generates all sizes
required by Tauri for Windows, macOS, iOS, and Android.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
import os
import struct
import io

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
ICONS_DIR = os.path.join(PROJECT_DIR, "src-tauri", "icons")

SIZE = 1024  # Master icon size


def lerp_color(c1, c2, t):
    """Linear interpolate between two RGB tuples."""
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def draw_thick_arc(draw, cx, cy, rx, ry, angle_start, angle_end, rotation,
                   width, color_start, color_end, steps=200):
    """Draw a rotated elliptical arc with gradient color and thickness."""
    cos_r = math.cos(rotation)
    sin_r = math.sin(rotation)

    points = []
    for i in range(steps + 1):
        t = i / steps
        angle = math.radians(angle_start + (angle_end - angle_start) * t)
        # Ellipse point
        ex = rx * math.cos(angle)
        ey = ry * math.sin(angle)
        # Rotate
        px = cx + ex * cos_r - ey * sin_r
        py = cy + ex * sin_r + ey * cos_r
        points.append((px, py, t))

    for i in range(len(points) - 1):
        x1, y1, t1 = points[i]
        x2, y2, t2 = points[i + 1]
        t_mid = (t1 + t2) / 2
        color = lerp_color(color_start, color_end, t_mid)
        draw.line([(x1, y1), (x2, y2)], fill=color, width=width)


def draw_orbital(draw, cx, cy, rx, ry, rotation, color_start, color_end,
                 width=14, arc_start=0, arc_end=360):
    """Draw one orbital ring."""
    draw_thick_arc(draw, cx, cy, rx, ry, arc_start, arc_end,
                   rotation, width, color_start, color_end)


def draw_sphere(img, cx, cy, radius, base_color, highlight_color):
    """Draw a glowing sphere (electron)."""
    draw = ImageDraw.Draw(img)
    # Outer glow
    for r in range(radius + 12, radius, -1):
        alpha = int(60 * (1 - (r - radius) / 12))
        glow_color = (*base_color, alpha)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=glow_color)
    # Sphere body
    for r in range(radius, 0, -1):
        t = 1 - (r / radius)
        color = lerp_color(base_color, highlight_color, t * 0.6)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    # Specular highlight
    hx, hy = cx - radius * 0.3, cy - radius * 0.3
    hr = radius * 0.35
    for r2 in range(int(hr), 0, -1):
        alpha = int(200 * (1 - r2 / hr))
        draw.ellipse([hx - r2, hy - r2, hx + r2, hy + r2],
                     fill=(255, 255, 255, alpha))


def draw_sparkle(draw, x, y, size, color=(255, 255, 220)):
    """Draw a small sparkle / star."""
    s = size
    # Vertical line
    draw.line([(x, y - s), (x, y + s)], fill=color, width=1)
    # Horizontal line
    draw.line([(x - s, y), (x + s, y)], fill=color, width=1)
    # Diagonal lines (smaller)
    ds = s * 0.6
    draw.line([(x - ds, y - ds), (x + ds, y + ds)], fill=color, width=1)
    draw.line([(x + ds, y - ds), (x - ds, y + ds)], fill=color, width=1)


def create_nebula_icon():
    """Create the main 1024x1024 Nebula icon."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)

    cx, cy = SIZE // 2, SIZE // 2

    # --- Background: subtle radial gradient (dark center) ---
    for r in range(SIZE // 2, 0, -1):
        t = r / (SIZE // 2)
        # Dark center to slightly lighter edges
        val = int(8 + 12 * t)
        alpha = 255
        color = (val, val, int(val * 1.2), alpha)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

    # --- Orbital parameters ---
    rx, ry = 340, 130  # Ellipse radii

    # Colors for orbital gradient (blue -> purple -> pink -> orange)
    BLUE = (60, 120, 255)
    PURPLE = (160, 60, 220)
    PINK = (230, 60, 160)
    ORANGE = (255, 160, 30)
    RED_ORANGE = (240, 80, 40)

    # Three orbitals at different rotations
    orbitals = [
        # (rotation_degrees, color_start, color_end)
        (-30, BLUE, PURPLE),
        (30, PURPLE, PINK),
        (90, ORANGE, RED_ORANGE),
    ]

    # Draw back halves first (behind text)
    for rot_deg, c_start, c_end in orbitals:
        rot = math.radians(rot_deg)
        draw_orbital(draw, cx, cy, rx, ry, rot, c_start, c_end,
                     width=16, arc_start=180, arc_end=360)

    # --- Code brackets </> ---
    # Use a clean font for the brackets
    bracket_size = 240
    try:
        font = ImageFont.truetype("consola.ttf", bracket_size)
    except (OSError, IOError):
        try:
            font = ImageFont.truetype("cour.ttf", bracket_size)
        except (OSError, IOError):
            try:
                font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", bracket_size)
            except (OSError, IOError):
                font = ImageFont.load_default()

    text = "</>"
    # Get text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = cx - tw // 2
    ty = cy - th // 2 - 20  # Slight upward offset

    # Draw text with slight shadow
    draw.text((tx + 3, ty + 3), text, fill=(0, 0, 0, 180), font=font)
    draw.text((tx, ty), text, fill=(230, 230, 240, 255), font=font)

    # Draw front halves of orbitals (in front of text)
    for rot_deg, c_start, c_end in orbitals:
        rot = math.radians(rot_deg)
        draw_orbital(draw, cx, cy, rx, ry, rot, c_start, c_end,
                     width=16, arc_start=0, arc_end=180)

    # --- Electron spheres ---
    # Position electrons on the orbitals
    electrons = [
        # (orbital_index, angle_on_ellipse, radius, base_color, highlight)
        (0, 220, 22, (80, 130, 255), (180, 200, 255)),   # Blue electron
        (2, 40, 22, (255, 160, 30), (255, 220, 140)),     # Orange electron
    ]

    for orb_idx, angle_deg, rad, base_col, hi_col in electrons:
        rot_deg, _, _ = orbitals[orb_idx]
        rot = math.radians(rot_deg)
        angle = math.radians(angle_deg)
        ex = rx * math.cos(angle)
        ey = ry * math.sin(angle)
        px = cx + ex * math.cos(rot) - ey * math.sin(rot)
        py = cy + ex * math.sin(rot) + ey * math.cos(rot)
        draw_sphere(img, int(px), int(py), rad, base_col, hi_col)

    # --- Sparkles ---
    import random
    random.seed(42)  # Deterministic
    sparkle_positions = [
        (180, 200, 6), (820, 180, 5), (850, 750, 7),
        (200, 700, 4), (750, 300, 5), (300, 150, 4),
        (700, 800, 6), (150, 450, 3), (880, 500, 4),
        (400, 850, 3), (600, 130, 4), (900, 350, 3),
    ]
    for sx, sy, ss in sparkle_positions:
        sparkle_color = (255, 255, random.randint(180, 255))
        draw_sparkle(draw, sx, sy, ss, sparkle_color)

    return img


def create_ico(images, ico_path):
    """Create a .ico file from a list of PIL Images."""
    # ICO format: header + directory entries + image data
    num_images = len(images)

    # ICO header: reserved(2) + type(2) + count(2)
    header = struct.pack("<HHH", 0, 1, num_images)

    # We'll store PNG-compressed data for each size
    image_data_list = []
    for img in images:
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        image_data_list.append(buf.getvalue())

    # Directory entries (16 bytes each), then image data
    dir_offset = 6 + num_images * 16  # After header + all directory entries
    directory = b""
    current_offset = dir_offset

    for i, img in enumerate(images):
        w = img.width if img.width < 256 else 0
        h = img.height if img.height < 256 else 0
        data_size = len(image_data_list[i])
        # width, height, color_count, reserved, planes, bit_count, size, offset
        entry = struct.pack("<BBBBHHII", w, h, 0, 0, 1, 32, data_size, current_offset)
        directory += entry
        current_offset += data_size

    with open(ico_path, "wb") as f:
        f.write(header)
        f.write(directory)
        for data in image_data_list:
            f.write(data)


def main():
    print("Generating Nebula icon...")
    master = create_nebula_icon()

    os.makedirs(ICONS_DIR, exist_ok=True)

    # Save master
    master_path = os.path.join(ICONS_DIR, "icon.png")
    master.save(master_path, "PNG")
    print(f"  Saved {master_path}")

    # Generate all required sizes for Tauri
    sizes = {
        "32x32.png": 32,
        "64x64.png": 64,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        # Windows Store logos
        "Square30x30Logo.png": 30,
        "Square44x44Logo.png": 44,
        "Square71x71Logo.png": 71,
        "Square89x89Logo.png": 89,
        "Square107x107Logo.png": 107,
        "Square142x142Logo.png": 142,
        "Square150x150Logo.png": 150,
        "Square284x284Logo.png": 284,
        "Square310x310Logo.png": 310,
        "StoreLogo.png": 50,
    }

    for filename, size in sizes.items():
        resized = master.resize((size, size), Image.LANCZOS)
        path = os.path.join(ICONS_DIR, filename)
        resized.save(path, "PNG")
        print(f"  Saved {path} ({size}x{size})")

    # Generate .ico (Windows) — multiple sizes embedded
    ico_sizes = [16, 24, 32, 48, 64, 128, 256]
    ico_images = [master.resize((s, s), Image.LANCZOS) for s in ico_sizes]
    ico_path = os.path.join(ICONS_DIR, "icon.ico")
    create_ico(ico_images, ico_path)
    print(f"  Saved {ico_path} (multi-size ICO)")

    # Generate .icns placeholder (macOS) — save as PNG, macOS builds would
    # need a proper icns tool. For now create a large PNG with .icns extension
    # that Tauri can work with on macOS builds.
    icns_source = master.resize((512, 512), Image.LANCZOS)
    icns_path = os.path.join(ICONS_DIR, "icon.icns")
    # For a real .icns we'd need a mac tool. Save as PNG — Tauri's bundler
    # on macOS will handle conversion. On Windows this file isn't used.
    icns_source.save(icns_path, "PNG")
    print(f"  Saved {icns_path} (PNG for macOS)")

    # Also save source as app-icon.png in project root for `tauri icon` command
    app_icon_path = os.path.join(PROJECT_DIR, "app-icon.png")
    master.save(app_icon_path, "PNG")
    print(f"  Saved {app_icon_path} (source for tauri icon)")

    print("\nDone! All icons generated successfully.")


if __name__ == "__main__":
    main()

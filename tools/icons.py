"""Generate the original layered LAYRLY icon using only Python's stdlib."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]

def inside(x, y, points):
    hit = False
    for i, (ax, ay) in enumerate(points):
        bx, by = points[i - 1]
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            hit = not hit
    return hit

def icon(size):
    layers = [([(10,30),(24,22),(38,30),(24,38)], (185,170,247)),
              ([(10,23),(24,15),(38,23),(24,31)], (224,217,255)),
              ([(10,16),(24,8),(38,16),(24,24)], (255,255,255))]
    data = bytearray()
    for y in range(size):
        data.append(0)
        for x in range(size):
            samples = []
            for sy in range(4):
                for sx in range(4):
                    px, py = (x + (sx+.5)/4)*48/size, (y+(sy+.5)/4)*48/size
                    dx, dy = max(14-px, 0, px-34), max(14-py, 0, py-34)
                    color = (117,96,223,255) if dx*dx+dy*dy <= 196 else (0,0,0,0)
                    for points, rgb in layers:
                        if inside(px, py, points): color = (*rgb, 255)
                    samples.append(color)
            alpha = sum(c[3] for c in samples)
            rgb = [round(sum(c[k]*c[3] for c in samples)/alpha) if alpha else 0 for k in range(3)]
            data.extend([*rgb, round(alpha/16)])
    def chunk(kind, payload):
        return struct.pack('!I',len(payload))+kind+payload+struct.pack('!I',zlib.crc32(kind+payload))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!IIBBBBB',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(data))+chunk(b'IEND',b'')

for size in (16,32,48,128):
    (ROOT/'assets'/'icons'/f'icon{size}.png').write_bytes(icon(size))

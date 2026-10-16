import os
import zlib
import struct

def make_png(width, height, fill_color=(238, 246, 245)):
  # PNG signature
  sig = b'\x89PNG\r\n\x1a\n'
  
  # IHDR
  ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0) # 8-bit RGB
  ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
  ihdr = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
  
  # Raw scanlines: 1 filter byte + RGB for each pixel
  header_height = int(height * 0.12)
  teal_color = (79, 155, 176)
  
  raw = bytearray()
  for y in range(height):
    raw.append(0) # Filter None
    is_header = y < header_height
    c = teal_color if is_header else fill_color
    raw.extend(bytes(c) * width)
    
  deflated = zlib.compress(bytes(raw), 9)
  idat_crc = zlib.crc32(b'IDAT' + deflated)
  idat = struct.pack('>I', len(deflated)) + b'IDAT' + deflated + struct.pack('>I', idat_crc)
  
  # IEND
  iend_crc = zlib.crc32(b'IEND')
  iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
  
  return sig + ihdr + idat + iend

os.makedirs('public', exist_ok=True)
with open('public/screenshot-desktop.png', 'wb') as f:
  f.write(make_png(1280, 720))

with open('public/screenshot-mobile.png', 'wb') as f:
  f.write(make_png(412, 915))

print("Created screenshot-desktop.png and screenshot-mobile.png")

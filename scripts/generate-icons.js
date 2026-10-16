import fs from 'node:fs';
import zlib from 'node:zlib';

function createPNG(width, height, drawFn) {
  // RGBA buffer + 1 filter byte per scanline
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(raw);

  // PNG Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    const crc = crc32(Buffer.concat([Buffer.from(type), data]));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // Simple CRC32 table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function drawWalletIcon(x, y, w, h) {
  // Normalize to 0..1
  const u = x / w;
  const v = y / h;

  // Squircle corner check
  const cx = 0.5, cy = 0.5;
  const dx = Math.abs(u - cx) * 2;
  const dy = Math.abs(v - cy) * 2;
  const rad = Math.pow(dx, 4) + Math.pow(dy, 4);

  if (rad > 1.0) {
    return [0, 0, 0, 0]; // Transparent outer
  }

  // Teal gradient background
  let r = Math.round(59 + (27 - 59) * v);
  let g = Math.round(130 + (77 - 130) * v);
  let b = Math.round(150 + (92 - 150) * v);

  // Inner wallet body (0.2 <= u <= 0.8, 0.3 <= v <= 0.72)
  if (u >= 0.22 && u <= 0.78 && v >= 0.30 && v <= 0.72) {
    // White card body
    r = 255; g = 255; b = 255;

    // Green clasp on right side
    if (u >= 0.56 && u <= 0.82 && v >= 0.44 && v <= 0.60) {
      r = 46; g = 158; b = 91; // #2e9e5b
      // Gold button
      const dist = Math.hypot((u - 0.66) * w, (v - 0.52) * h);
      if (dist <= w * 0.035) {
        r = 245; g = 180; b = 35; // Gold
      }
    } else if (v >= 0.46 && v <= 0.47) {
      // Wallet seam
      r = 220; g = 235; b = 235;
    }
  } else if (u >= 0.30 && u <= 0.70 && v >= 0.24 && v < 0.30) {
    // Upper card tab
    r = 160; g = 210; b = 220;
  }

  return [r, g, b, 255];
}

if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

fs.writeFileSync('public/icon-192.png', createPNG(192, 192, drawWalletIcon));
fs.writeFileSync('public/icon-512.png', createPNG(512, 512, drawWalletIcon));
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180, drawWalletIcon));
console.log('Successfully generated public icons: icon-192.png, icon-512.png, apple-touch-icon.png');

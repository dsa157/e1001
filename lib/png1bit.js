/**
 * ============================================================================
 * Seeed reTerminal E1001 - 1-Bit Dithered PNG Encoder
 * Version: 2026.09.29.16.00.00
 * Description: Converts 32-bit RGBA canvas buffers into ultra-compact 1-bit
 *              monochrome PNG images (<10KB) with Floyd-Steinberg dithering.
 *              Designed specifically for ESPHome online_image binary buffers.
 * ============================================================================
 */

const zlib = require('zlib');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Top-level configuration parameters (Zero magic numbers)
const DEFAULT_WIDTH = 800;                 // default: 800 (Native display width)
const DEFAULT_HEIGHT = 480;                // default: 480 (Native display height)
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/**
 * Build a PNG chunk with CRC32
 */
function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcVal = zlib.crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Encode RGBA pixel array into 1-bit monochrome PNG buffer with Floyd-Steinberg dithering
 * @param {Uint8ClampedArray|Buffer} rgbaBuffer 
 * @param {number} width 
 * @param {number} height 
 * @param {boolean} dither 
 * @returns {Buffer} 1-bit PNG Buffer
 */
function encode1BitPng(rgbaBuffer, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, dither = true) {
  const rowBytes = Math.ceil(width / 8);
  const rawData = Buffer.alloc((rowBytes + 1) * height);
  
  // Grayscale working array for error diffusion
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = rgbaBuffer[i * 4];
    const g = rgbaBuffer[i * 4 + 1];
    const b = rgbaBuffer[i * 4 + 2];
    gray[i] = (r * 0.299 + g * 0.587 + b * 0.114);
  }

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawData[rowOffset] = 0; // PNG filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = gray[idx];
      const newVal = oldVal < 128 ? 0 : 255;
      const err = oldVal - newVal;

      if (newVal === 255) {
        const byteIdx = rowOffset + 1 + (x >> 3);
        const bitIdx = 7 - (x & 7);
        rawData[byteIdx] |= (1 << bitIdx);
      }

      if (dither) {
        if (x + 1 < width) gray[idx + 1] += err * (7 / 16);
        if (y + 1 < height) {
          if (x > 0) gray[idx + width - 1] += err * (3 / 16);
          gray[idx + width] += err * (5 / 16);
          if (x + 1 < width) gray[idx + width + 1] += err * (1 / 16);
        }
      }
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 1; // 1-bit depth
  ihdrData[9] = 0; // Grayscale (0=black, 1=white)
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Default filter
  ihdrData[12] = 0; // No interlace

  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

/**
 * Helper to convert any PNG buffer into 1-bit PNG buffer
 * @param {Buffer} pngBuffer 
 * @param {boolean} dither 
 * @returns {Promise<Buffer>}
 */
async function to1BitPng(pngBuffer, dither = true) {
  const canvas = createCanvas(DEFAULT_WIDTH, DEFAULT_HEIGHT);
  const ctx = canvas.getContext('2d');
  const img = await loadImage(pngBuffer);
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);
  return encode1BitPng(imgData.data, DEFAULT_WIDTH, DEFAULT_HEIGHT, dither);
}

module.exports = {
  encode1BitPng,
  to1BitPng
};

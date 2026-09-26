import { writeFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

/**
 * Writes a Y4M video (the format Chrome's fake camera plays) that shows the QR code of `text`,
 * so the scanner page reads a real QR code through a real camera stream.
 * Chrome opens the file when the camera starts, so it can be (re)written just before.
 */
export function writeQrVideo(file: string, text: string) {
  const svg = renderToStaticMarkup(createElement(QRCodeSVG, { value: text, level: 'M', marginSize: 0 }));
  const size = Number(svg.match(/viewBox="0 0 (\d+) /)![1]);
  const dark = new Uint8Array(size * size);
  const path = svg.match(/fill="#000000" d="([^"]+)"/)![1];
  for (const run of path.matchAll(/M(\d+)[ ,](\d+)\s*h(\d+)/g)) {
    const [x, y, w] = [Number(run[1]), Number(run[2]), Number(run[3])];
    for (let i = 0; i < w; i++) dark[y * size + x + i] = 1;
  }

  const W = 640;
  const H = 480;
  const quiet = 4; // white border around the code, in modules
  const cell = Math.floor((Math.min(W, H) * 0.8) / (size + quiet * 2));
  const side = (size + quiet * 2) * cell;
  const left = Math.floor((W - side) / 2);
  const top = Math.floor((H - side) / 2);

  const luma = Buffer.alloc(W * H, 235);
  for (let py = 0; py < side; py++) {
    for (let px = 0; px < side; px++) {
      const mx = Math.floor(px / cell) - quiet;
      const my = Math.floor(py / cell) - quiet;
      if (mx >= 0 && my >= 0 && mx < size && my < size && dark[my * size + mx]) luma[(top + py) * W + left + px] = 16;
    }
  }
  const chroma = Buffer.alloc((W / 2) * (H / 2), 128);
  const frame = Buffer.concat([Buffer.from('FRAME\n'), luma, chroma, chroma]);
  writeFileSync(file, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`), frame, frame]));
}

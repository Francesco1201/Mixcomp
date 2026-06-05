import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LufsService {

  constructor() { }

  calculate(buffer: AudioBuffer): number {
    const data = buffer.getChannelData(0);
    const blockSize = Math.floor(buffer.sampleRate * 0.4);

    let sum = 0;
    let validBlocks = 0;

    for (let i = 0; i + blockSize < data.length; i += blockSize) {
      let blockSum = 0;
      for (let j = i; j < i + blockSize; j++) {
        blockSum += data[j] * data[j];
      }
      const meanSquare = blockSum / blockSize;
      if (meanSquare > 1e-10) {
        sum += meanSquare;
        validBlocks++;
      }
    }
    if (validBlocks === 0) return -70;
    return -0.691 + 10 * Math.log10(sum / validBlocks);
  }

  calculatePeak(buffer: AudioBuffer): number {
    let max = 0;

    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > max) max = abs;
      }
    }
    return 20 * Math.log10(Math.max(max, 1e-10));
  }

  difference(lufsA: number, lufsB: number): number {
    return lufsA - lufsB;
  }

  normalizeGain(lufsA: number, lufsB: number): { gainA: number, gainB: number } {
    const diff = lufsA - lufsB;
    if (diff > 0) {
      return { gainA: 1, gainB: Math.pow(10, diff / 20) };
    } else {
      return { gainA: Math.pow(10, -diff / 20), gainB: 1 };
    }
  }

  

}

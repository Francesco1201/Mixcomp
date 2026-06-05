import { Component, OnChanges, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { FormsModule } from "@angular/forms";

@Component({
  standalone: true,
  selector: 'app-spectral',
  imports: [FormsModule],
  templateUrl: './spectral.component.html',
  styleUrl: './spectral.component.scss'
})
export class SpectralComponent implements OnChanges, OnDestroy{
  @Input() analyserAL: AnalyserNode | null = null;
  @Input() analyserBL: AnalyserNode | null = null;
  @Input() isPlaying = false;
  logScale = true;
  dbMin = -90;
  dbMax = 0;
  smoothing = 0.8;

  @ViewChild('spectralCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private animationId: number = 0;

  startLoop(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const w = canvas.width;
      const h = canvas.height;
      const padLeft = 36;
      const padBottom = 20;
      const padTop = 10;
      const plotW = w - padLeft;
      const plotH = h - padBottom - padTop;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#16181c';
      ctx.fillRect(0, 0, w, h);

      const sampleRate = this.analyserAL?.context.sampleRate || 44100;
      const bufLen = this.analyserAL?.frequencyBinCount || 1024;

      const dbMarks = [-90, -72, -54, -36, -24, -12, -6, 0];
      dbMarks.forEach(db => {
        if (db < this.dbMin || db > this.dbMax) return;
        const y = padTop + plotH - ((db - this.dbMin) / (this.dbMax - this.dbMin)) * plotH;
        ctx.strokeStyle = '#ffb900';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.fillStyle = '#ffb900';
        ctx.font = '9px DM Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(db + '', padLeft - 4, y + 3);
      });

      const hzMarks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
      const nyquist = sampleRate / 2;
      hzMarks.forEach(hz => {
        if (hz > nyquist) return;
        const x = this.freqToX(hz, nyquist, bufLen, padLeft, plotW);
        ctx.strokeStyle = '#ffb900';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + plotH);
        ctx.stroke();
        ctx.fillStyle = '#ffb900';
        ctx.font = '9px DM Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(hz >= 1000 ? (hz / 1000) + 'k' : hz + '', x, h - 6);
      });

      this.drawTrace(ctx, this.analyserAL, '#4ade80', padLeft, padTop, plotW, plotH, bufLen, nyquist);
      this.drawTrace(ctx, this.analyserBL, '#60a5fa', padLeft, padTop, plotW, plotH, bufLen, nyquist);

      this.animationId = requestAnimationFrame(draw);
    };

    draw();
  }

  freqToX(hz: number, nyquist: number, bufLen: number, padLeft: number, plotW: number): number {
    if (this.logScale) {
      const logMin = Math.log10(20);
      const logMax = Math.log10(nyquist);
      return padLeft + ((Math.log10(hz) - logMin) / (logMax - logMin)) * plotW;
    } else {
      return padLeft + (hz / nyquist) * plotW;
    }
  }

  drawTrace(
    ctx: CanvasRenderingContext2D,
    analyser: AnalyserNode | null,
    color: string,
    padLeft: number, padTop: number,
    plotW: number, plotH: number,
    bufLen: number, nyquist: number
  ): void {
    if (!analyser) return;
    const data = new Uint8Array(bufLen);
    analyser.getByteFrequencyData(data);

    ctx.beginPath();
    let started = false;

    for (let i = 1; i < bufLen; i++) {
      const hz = (i / bufLen) * nyquist;
      if (hz < 20) continue;
      const x = this.freqToX(hz, nyquist, bufLen, padLeft, plotW);
      const db = (data[i] / 255) * (this.dbMax - this.dbMin) + this.dbMin;
      const y = padTop + plotH - ((db - this.dbMin) / (this.dbMax - this.dbMin)) * plotH;

      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.closePath();
    ctx.fillStyle = color.replace(')', ', 0.07)').replace('rgb', 'rgba');
    ctx.fill();
  }

  ngOnChanges(): void {
    cancelAnimationFrame(this.animationId);
    if (this.analyserAL) this.analyserAL.smoothingTimeConstant = this.smoothing;
    if (this.analyserBL) this.analyserBL.smoothingTimeConstant = this.smoothing;
    if (this.isPlaying && (this.analyserAL || this.analyserBL)) {
      this.startLoop();
    }
  }

  onSettingChange(): void {
    if (this.analyserAL) this.analyserAL.smoothingTimeConstant = this.smoothing;
    if (this.analyserBL) this.analyserBL.smoothingTimeConstant = this.smoothing;
  }

  clear(): void {
    if (this.canvasRef) {
      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
  }

}

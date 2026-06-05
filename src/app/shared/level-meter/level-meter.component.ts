import { Component, Input, ViewChild, ElementRef, OnChanges, OnDestroy } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-level-meter',
  imports: [],
  templateUrl: './level-meter.component.html',
  styleUrl: './level-meter.component.scss'
})
export class LevelMeterComponent {
  @Input() analyserL: AnalyserNode | null = null;
  @Input() analyserR: AnalyserNode | null = null;
  @Input() isPlaying = false;

  private animationId = 0;
  private peakL = 0;
  private peakR = 0;
  private peakHoldL = 0;
  private peakHoldR = 0;
  private peakTimerL = 0;
  private peakTimerR = 0;
  private smoothL = 0;
  private smoothR = 0;

  @ViewChild('meterCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  startLoop(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (this.analyserL && this.analyserR) {
        const bufLen = this.analyserL.fftSize;
        const dataL = new Float32Array(bufLen);
        const dataR = new Float32Array(bufLen);
        this.analyserL.getFloatTimeDomainData(dataL);
        this.analyserR.getFloatTimeDomainData(dataR);

        let sumL = 0, sumR = 0;
        for (let i = 0; i < bufLen; i++) {
          sumL += dataL[i] * dataL[i];
          sumR += dataR[i] * dataR[i];
        }
        const rmsL = Math.sqrt(sumL / bufLen);
        const rmsR = Math.sqrt(sumR / bufLen);

        this.smoothL = this.smoothL * 0.85 + rmsL * 0.15;
        this.smoothR = this.smoothR * 0.85 + rmsR * 0.15;

        const dbL = 20 * Math.log10(Math.max(this.smoothL, 1e-10));
        const dbR = 20 * Math.log10(Math.max(this.smoothR, 1e-10));

        if (dbL > this.peakHoldL) { this.peakHoldL = dbL; this.peakTimerL = 90; }
        if (dbR > this.peakHoldR) { this.peakHoldR = dbR; this.peakTimerR = 90; }
        if (this.peakTimerL > 0) this.peakTimerL--;
        else this.peakHoldL -= 0.5;
        if (this.peakTimerR > 0) this.peakTimerR--;
        else this.peakHoldR -= 0.5;

        const barW = w * 0.35;
        const gap = w * 0.1;
        const xL = w / 2 - barW - gap / 2;
        const xR = w / 2 + gap / 2;

        this.drawBar(ctx, xL, barW, h, dbL, this.peakHoldL);
        this.drawBar(ctx, xR, barW, h, dbR, this.peakHoldR);

        ctx.fillStyle = '#6b7280';
        ctx.font = '10px DM Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(dbL.toFixed(1), xL + barW / 2, h - 4);
        ctx.fillText(dbR.toFixed(1), xR + barW / 2, h - 4);

        ctx.fillStyle = '#9ca3af';
        ctx.fillText('L', xL + barW / 2, 12);
        ctx.fillText('R', xR + barW / 2, 12);
      }

      this.animationId = requestAnimationFrame(draw);
    };

    draw();
  }

  drawBar(ctx: CanvasRenderingContext2D, x: number, w: number, h: number, db: number, peak: number): void {
    const minDb = -60;
    const maxDb = 0;
    const range = maxDb - minDb;
    const barH = h - 30;

    ctx.fillStyle = '#1e2128';
    ctx.fillRect(x, 16, w, barH);

    const level = Math.max(0, Math.min(1, (db - minDb) / range));
    const filledH = level * barH;
    const yStart = 16 + barH - filledH;

    const y0 = 16;
    const yGreen = 16 + barH * (1 - ((-6) - minDb) / range);
    const yYellow = 16 + barH * (1 - ((-18) - minDb) / range);

    if (yStart < yGreen) {
      ctx.fillStyle = '#f87171';
      ctx.fillRect(x, yStart, w, Math.min(filledH, yGreen - yStart));
    }

    if (yStart < yYellow) {
      const yTop = Math.max(yStart, yGreen);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x, yTop, w, Math.min(yYellow - yTop, filledH - (yTop - yStart)));
    }

    const yGreenStart = Math.max(yStart, yYellow);
    if (yGreenStart < 16 + barH) {
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(x, yGreenStart, w, 16 + barH - yGreenStart);
    }

    const peakLevel = Math.max(0, Math.min(1, (peak - minDb) / range));
    const peakY = 16 + barH - peakLevel * barH;
    ctx.fillStyle = peak > -6 ? '#f87171' : peak > -18 ? '#fbbf24' : '#4ade80';
    ctx.fillRect(x, peakY, w, 2);

    [-48, -36, -24, -18, -12, -6, -3].forEach(mark => {
      const markLevel = (mark - minDb) / range;
      const markY = 16 + barH - markLevel * barH;
      ctx.fillStyle = 'rgba(107,114,128,0.4)';
      ctx.fillRect(x - 3, markY, w + 6, 0.5);
    });
  }

  ngOnChanges(): void {
    cancelAnimationFrame(this.animationId);
    if (this.isPlaying && (this.analyserL || this.analyserR)) {
      this.peakHoldL = -60;
      this.peakHoldR = -60;
      this.smoothL = 0;
      this.smoothR = 0;
      this.startLoop();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
  }

  clear(): void {
    cancelAnimationFrame(this.animationId);
    this.peakHoldL = -60;
    this.peakHoldR = -60;
    this.smoothL = 0;
    this.smoothR = 0;
    if (this.canvasRef) {
      const canvas = this.canvasRef.nativeElement;
      canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

}

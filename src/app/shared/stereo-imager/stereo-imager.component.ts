import { Component, Input, ViewChild, ElementRef, OnChanges, OnDestroy } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-stereo-imager',
  imports: [],
  templateUrl: './stereo-imager.component.html',
  styleUrl: './stereo-imager.component.scss'
})
export class StereoImagerComponent implements OnChanges, OnDestroy {
  @Input() analyserL: AnalyserNode | null = null;
  @Input() analyserR: AnalyserNode | null = null;
  @Input() color: string = '#4ade80';
  @Input() isPlaying = false;

  @ViewChild('lissajousCanvas') lissajousRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('correlationCanvas') correlationRef!: ElementRef<HTMLCanvasElement>;

  private animationId: number = 0;

  ngOnChanges(): void {
    cancelAnimationFrame(this.animationId);
    if (this.isPlaying && (this.analyserL || this.analyserR)) {
      this.startLoop();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
  }

  startLoop(): void {
    const lissajous = this.lissajousRef.nativeElement;
    const lCtx = lissajous.getContext('2d')!;
    const meter = this.correlationRef.nativeElement;
    const mCtx = meter.getContext('2d')!;

    const draw = () => {
      lissajous.width = lissajous.offsetWidth;
      lissajous.height = lissajous.offsetHeight;
      meter.width = meter.offsetWidth;
      meter.height = meter.offsetHeight;

      if (this.analyserL && this.analyserR) {
        const bufLen = this.analyserL.fftSize;
        const dataL = new Float32Array(bufLen);
        const dataR = new Float32Array(bufLen);
        this.analyserL.getFloatTimeDomainData(dataL);
        this.analyserR.getFloatTimeDomainData(dataR);

        // Lissajous
        lCtx.clearRect(0, 0, lissajous.width, lissajous.height);
        lCtx.beginPath();
        const cx = lissajous.width / 2;
        const cy = lissajous.height / 2;
        const scale = Math.min(cx, cy) * 0.9;

        for (let i = 0; i < bufLen; i++) {
          const x = cx + dataL[i] * scale;
          const y = cy - dataR[i] * scale;
          i === 0 ? lCtx.moveTo(x, y) : lCtx.lineTo(x, y);
        }
        lCtx.strokeStyle = this.color;
        lCtx.lineWidth = 1;
        lCtx.stroke();

        // Correlation meter
        let sumLR = 0, sumL2 = 0, sumR2 = 0;
        for (let i = 0; i < bufLen; i++) {
          sumLR += dataL[i] * dataR[i];
          sumL2 += dataL[i] * dataL[i];
          sumR2 += dataR[i] * dataR[i];
        }
        const correlation = sumLR / Math.sqrt(sumL2 * sumR2 + 1e-10);

        const w = meter.width;
        const h = meter.height;
        const mid = w / 2;
        const pos = mid + correlation * mid;

        mCtx.fillStyle = '#1e2128';
        mCtx.fillRect(0, 0, w, h);
        mCtx.fillStyle = correlation > 0 ? this.color : '#f87171';
        mCtx.fillRect(Math.min(mid, pos), h * 0.2, Math.abs(pos - mid), h * 0.6);
        mCtx.fillStyle = '#ffffff';
        mCtx.fillRect(mid - 1, 0, 2, h);
      }

      this.animationId = requestAnimationFrame(draw);
    };

    draw();
  }

  clear(): void {
    if (this.lissajousRef) {
      const c = this.lissajousRef.nativeElement;
      c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    }
    if (this.correlationRef) {
      const c = this.correlationRef.nativeElement;
      c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    }
  }
}

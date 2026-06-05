import { Component, Input, ViewChild, ElementRef, OnChanges, Output, EventEmitter, SimpleChanges } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-waveform',
  imports: [],
  templateUrl: './waveform.component.html',
  styleUrl: './waveform.component.scss'
})
export class WaveformComponent implements OnChanges {
  @Input() buffer: AudioBuffer | null = null;
  @Input() color: string = '#4ade80';
  @Input() duration: number = 0;
  @Input() currentTime: number = 0;
  @Output() seek = new EventEmitter<number>();

  @ViewChild('waveformCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['buffer'] && this.buffer) {
      const canvas = this.canvasRef.nativeElement;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    if (!this.buffer && this.canvasRef) {
      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    if (this.buffer && this.canvasRef) {
      this.drawWaveform();
    }
  }

  drawWaveform(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const data = this.buffer!.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    for (let x = 0; x < width; x++) {
      let min = 1, max = -1;
      for (let s = 0; s < step; s++) {
        const v = data[x * step + s] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      ctx.fillStyle = this.color;
      ctx.fillRect(x, amp + min * amp, 1, (max - min) * amp);
    }

    if (this.duration > 0) {
      const cursorX = (this.currentTime / this.duration) * width;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cursorX, 0, 2, height);
    }
  }

  onCanvasClick(event: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = x / rect.width;
    this.seek.emit(ratio * this.duration);
  }
}

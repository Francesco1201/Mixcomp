import { Component, ChangeDetectorRef, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { WaveformComponent } from '../../shared/waveform/waveform.component';
import { SpectralComponent } from '../../shared/spectral/spectral.component';
import { DecimalPipe } from '@angular/common';
import { AudioService } from '../../core/audio.service';
import { LufsService } from '../../core/lufs.service';
import { PlayerControlsComponent } from "../../shared/player-controls/player-controls.component";
import { StereoImagerComponent } from '../../shared/stereo-imager/stereo-imager.component';
import { LevelMeterComponent } from "../../shared/level-meter/level-meter.component";

@Component({
  selector: 'app-comparator',
  imports: [WaveformComponent, SpectralComponent, DecimalPipe, PlayerControlsComponent, StereoImagerComponent, LevelMeterComponent],
  templateUrl: './comparator.component.html',
  styleUrl: './comparator.component.scss'
})
export class ComparatorComponent {
  @ViewChild('fileInputA') fileInputA!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputB') fileInputB!: ElementRef<HTMLInputElement>;
  @ViewChild(SpectralComponent) spectralComp!: SpectralComponent;
  @ViewChild('stereoA') stereoA!: StereoImagerComponent;
  @ViewChild('stereoB') stereoB!: StereoImagerComponent;
  @ViewChild('meterA') meterA!: LevelMeterComponent;
  @ViewChild('meterB') meterB!: LevelMeterComponent;
  bufferA: AudioBuffer | null = null;
  bufferB: AudioBuffer | null = null;
  analyserAL: AnalyserNode | null = null;
  analyserAR: AnalyserNode | null = null;
  analyserBL: AnalyserNode | null = null;
  analyserBR: AnalyserNode | null = null;
  lufsA: number | null = null;
  lufsB: number | null = null;
  peakA: number | null = null;
  peakB: number | null = null;

  offsetA = 0;
  offsetB = 0;
  startTimeA = 0;
  startTimeB = 0;

  currentTimeA = 0;
  currentTimeB = 0;

  private sourceA: AudioBufferSourceNode | null = null;
  private sourceB: AudioBufferSourceNode | null = null;
  private gainA: GainNode | null = null;
  private gainB: GainNode | null = null;
  private rafId = 0;

  isPlayingA = false;
  isPlayingB = false;

  isNormalized = false;

  constructor(
    private audioService: AudioService,
    private lufsService: LufsService,
    private cdr: ChangeDetectorRef
  ) {}

  async onFileSelected(file: File, id: 'a' | 'b'): Promise<void> {
    await this.audioService.resume();
    const buffer = await this.audioService.loadFile(file);

    if (id === 'a') {
      this.bufferA = buffer;
      this.lufsA = this.lufsService.calculate(buffer);
      this.peakA = this.lufsService.calculatePeak(buffer);
      this.gainA = this.audioService.createGainNode();
      this.gainA.connect(this.audioService.destination);
      const splitterA = this.audioService.createChannelSplitter();
      this.gainA.connect(splitterA);
      this.analyserAL = this.audioService.createAnalyserNode();
      this.analyserAR = this.audioService.createAnalyserNode();
      splitterA.connect(this.analyserAL, 0);
      splitterA.connect(this.analyserAR, 1);
    } else {
      this.bufferB = buffer;
      this.lufsB = this.lufsService.calculate(buffer);
      this.peakB = this.lufsService.calculatePeak(buffer);
      this.gainB = this.audioService.createGainNode();
      this.gainB.connect(this.audioService.destination);
      const splitterB = this.audioService.createChannelSplitter();
      this.gainB.connect(splitterB);
      this.analyserBL = this.audioService.createAnalyserNode();
      this.analyserBR = this.audioService.createAnalyserNode();
      splitterB.connect(this.analyserBL, 0);
      splitterB.connect(this.analyserBR, 1);
    }
  }

  onFileA(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.onFileSelected(input.files[0], 'a');
  }

  onFileB(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.onFileSelected(input.files[0], 'b');
  }

  async onPlayA(): Promise<void> {
    if (this.isPlayingA) {
      this.offsetA = this.audioService.getCurrentTime() - this.startTimeA;
      this.stopSource('a');
      return;
    } else {
      if (!this.bufferA) return;
      await this.audioService.resume();
      this.sourceA = this.audioService.createSourceNode(this.bufferA);
      this.sourceA.connect(this.gainA!);
      this.sourceA.start(0, this.offsetA);
      this.startTimeA = this.audioService.getCurrentTime() - this.offsetA;
      this.isPlayingA = true;
      this.sourceA.onended = () => {
        this.offsetA = 0;
        this.isPlayingA = false;
        this.cdr.detectChanges();
      };
    }
  }

  async onPlayB(): Promise<void> {
    if (this.isPlayingB) {
      this.offsetB = this.audioService.getCurrentTime() - this.startTimeB;
      this.stopSource('b');
      return;
    } else {
      if (!this.bufferB) return;
      await this.audioService.resume();
      this.sourceB = this.audioService.createSourceNode(this.bufferB);
      this.sourceB.connect(this.gainB!);
      this.sourceB.start(0, this.offsetB);
      this.startTimeB = this.audioService.getCurrentTime() - this.offsetB;
      this.isPlayingB = true;
      this.sourceB.onended = () => {
        this.offsetB = 0;
        this.isPlayingB = false;
        this.cdr.detectChanges();
      };
    }
  }

  onNormalize(): void {
    this.isNormalized = !this.isNormalized;

    if (this.isNormalized && this.lufsA !== null && this.lufsB !== null) {
      const { gainA, gainB } = this.lufsService.normalizeGain(this.lufsA, this.lufsB);
      if (this.gainA) this.gainA.gain.value = gainA;
      if (this.gainB) this.gainB.gain.value = gainB;
    } else {
      if (this.gainA) this.gainA.gain.value = 1;
      if (this.gainB) this.gainB.gain.value = 1;
    }
  }

  async onPlayBoth(): Promise<void> {
    if (!this.isPlayingA) await this.onPlayA();
    if (!this.isPlayingB) await this.onPlayB();
  }

  onSwitchAB(): void {
    if (this.isPlayingA) {
      this.offsetA = this.audioService.getCurrentTime() - this.startTimeA;
      this.stopSource('a');
      this.onPlayB();
    } else if (this.isPlayingB) {
      this.offsetB = this.audioService.getCurrentTime() - this.startTimeB;
      this.stopSource('b');
      this.onPlayA();
    } else {
      this.onPlayA();
    }
  }

  onReset(): void {
    this.stopSource('a');
    this.stopSource('b');
    this.bufferA = null;
    this.bufferB = null;
    this.lufsA = null;
    this.lufsB = null;
    this.peakA = null;
    this.peakB = null;
    this.offsetA = 0;
    this.offsetB = 0;
    this.startTimeA = 0;
    this.startTimeB = 0;
    this.currentTimeA = 0;
    this.currentTimeB = 0;
    this.isNormalized = false;
    this.gainA = null;
    this.gainB = null;
    this.analyserAL = null;
    this.analyserAR = null;
    this.analyserBL = null;
    this.analyserBR = null;
    this.fileInputA.nativeElement.value = '';
    this.fileInputB.nativeElement.value = '';
    this.meterA?.clear();
    this.meterB?.clear();
    this.spectralComp?.clear();
    this.stereoA?.clear();
    this.stereoB?.clear();
    this.cdr.detectChanges();
  }

  onSeekA(time: any): void {
    this.offsetA = time as number;
    if (this.isPlayingA) {
      this.stopSource('a');
      this.onPlayA();
    }
  }

  onSeekB(time: any): void {
    this.offsetB = time as number;
    if (this.isPlayingB) {
      this.stopSource('b');
      this.onPlayB();
    }
  }

  private stopSource(id: 'a' | 'b'): void {
    if (id === 'a') {
      if (this.sourceA) {
        this.sourceA.onended = null;
        try { this.sourceA.stop(); } catch(e) {}
        this.sourceA.disconnect();
        this.sourceA = null;
      }
      this.isPlayingA = false;
    } else {
      if (this.sourceB) {
        this.sourceB.onended = null;
        try { this.sourceB.stop(); } catch(e) {}
        this.sourceB.disconnect();
        this.sourceB = null;
      }
      this.isPlayingB = false;
    }
  }

  onRewind(): void {
    this.offsetA = 0;
    this.offsetB = 0;
    if (this.isPlayingA) {
      this.stopSource('a');
      this.onPlayA();
    }
    if (this.isPlayingB) {
      this.stopSource('b');
      this.onPlayB();
    }
    this.currentTimeA = 0;
    this.currentTimeB = 0;
    this.cdr.detectChanges();
  }

  onStop(): void {
    if (this.isPlayingA) this.offsetA = this.audioService.getCurrentTime() - this.startTimeA;
    if (this.isPlayingB) this.offsetB = this.audioService.getCurrentTime() - this.startTimeB;
    this.stopSource('a');
    this.stopSource('b');
  }

  ngOnInit(): void {
    const update = () => {
      if (this.isPlayingA) {
        this.currentTimeA = this.audioService.getCurrentTime() - this.startTimeA;
      }
      if (this.isPlayingB) {
        this.currentTimeB = this.audioService.getCurrentTime() - this.startTimeB;
      }
      if (this.isPlayingA || this.isPlayingB) {
        this.drawWaveforms();
      }
      this.rafId = requestAnimationFrame(update);
    };
    this.rafId = requestAnimationFrame(update);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  drawWaveforms(): void {
    this.cdr.detectChanges();
  }
}

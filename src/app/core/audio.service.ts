import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {

  private audioContext!: AudioContext;

  constructor() {
    this.audioContext = new AudioContext();
  }

  get destination(): AudioDestinationNode {
    return this.audioContext.destination;
  }

  async resume(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  loadFile(file:File): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          this.audioContext.decodeAudioData(arrayBuffer, resolve, reject);
        };

        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
  }

  createGainNode(): GainNode{
    return this.audioContext.createGain();
  }

  createAnalyserNode(): AnalyserNode{
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 2048;
    return analyser;
  }

  createSourceNode(buffer: AudioBuffer): AudioBufferSourceNode {
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  createChannelSplitter(): ChannelSplitterNode {
    return this.audioContext.createChannelSplitter(2);
  }

  getCurrentTime(): number {
    return this.audioContext.currentTime;
  }

}

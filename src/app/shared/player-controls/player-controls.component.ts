import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass, NgIf } from "@angular/common";

@Component({
  standalone: true,
  selector: 'app-player-controls',
  imports: [NgClass, NgIf],
  templateUrl: './player-controls.component.html',
  styleUrl: './player-controls.component.scss'
})
export class PlayerControlsComponent {
  @Input() isPlayingA = false;
  @Input() isPlayingB = false;
  @Input() isNormalized = false;
  @Input() canAct = false;
  @Input() hasA = false;
  @Input() hasB = false;
  @Input() hasAny = false;
  @Output() playA = new EventEmitter<void>();
  @Output() playB = new EventEmitter<void>();
  @Output() playBoth = new EventEmitter<void>();
  @Output() switchAB = new EventEmitter<void>();
  @Output() normalize = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() rewind = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();
}

import { TestBed } from '@angular/core/testing';

import { LufsService } from './lufs.service';

describe('LufsService', () => {
  let service: LufsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LufsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

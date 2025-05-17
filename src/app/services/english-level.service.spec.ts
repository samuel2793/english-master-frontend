import { TestBed } from '@angular/core/testing';

import { EnglishLevelService } from './english-level.service';

describe('EnglishLevelService', () => {
  let service: EnglishLevelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EnglishLevelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

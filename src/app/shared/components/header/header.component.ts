import { Component } from '@angular/core';
import { EnglishLevelService } from '../../../services/english-level.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  level = this.englishLevelService.getCurrentLevel();
  levelsAvaliable = this.englishLevelService.getAvailableLevels();

  constructor(private englishLevelService: EnglishLevelService) { }

  setLevel(level: string) {
    this.englishLevelService.setUserLevel(level as any);
    this.level = this.englishLevelService.getCurrentLevel();
  }
}

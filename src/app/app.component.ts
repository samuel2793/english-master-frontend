import { Component } from '@angular/core';
import { EnglishLevelService } from './services/english-level.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(private englishLevelService: EnglishLevelService) { }
  title = 'english-master-frontend';
  level = this.englishLevelService.getCurrentLevel()
  levelsAvaliable = this.englishLevelService.getAvailableLevels()

  setLevel(level: string) {
    this.englishLevelService.setUserLevel(level as any);
    this.level = this.englishLevelService.getCurrentLevel()
  }
}

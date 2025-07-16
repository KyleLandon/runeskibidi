import * as PIXI from 'pixi.js';
import { Player } from './Player';

export class Game {
  app: PIXI.Application;
  player: Player;
  constructor(container: HTMLElement) {
    this.app = new PIXI.Application({
      width: 800,
      height: 600,
      backgroundColor: 0x222222,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    container.appendChild(this.app.view as HTMLCanvasElement);

    // Create player in the center
    this.player = new Player(400, 300);
    this.app.stage.addChild(this.player);
  }
  // Placeholder for future game logic
} 
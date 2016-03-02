require("../css/main.css");
import Game from './game';

var colorBlindPalette = [
  0xE79F29,
  0x5CB4E4,
  0x069F73,
  0xF1E545,
  0x0674AF,
  0xD25F26,
  0xC87CAA
]

var game = window.game = new Game(document.body, colorBlindPalette);
window.addEventListener( 'resize', ::game.onWindowResize, false );
game.animate();

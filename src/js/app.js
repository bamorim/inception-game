require("../css/main.css");
import Game from './game';

var game = window.game = new Game(document.body);
window.addEventListener( 'resize', ::game.onWindowResize, false );
game.animate();

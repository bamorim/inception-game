import THREE from 'three';
import Level from './level';

class Game {
  constructor(elm,palette){
    this.palette = palette;
		this.prevTime = performance.now();
    this.setupRenderer();
    this.setupLevels();
    this.setupDOM(elm);
    this.setupPointerLock(elm);
    this.pause();
    this.setupNestingEvents();
  }

  setupNestingEvents(){
    window.levels = this.levels;
    document.addEventListener( 'keypress', ({keyCode})=>{
      // Press e to go down and q to go up
      if(keyCode == 101){
        if(this.levels[this.current_level].isNearBox())
          this.goDown();
      } else if(keyCode == 113){
        this.goUp();
      }
    });
  }

  setupPointerLock(element){
    let pointerLockChange = ( event ) => {
      if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {
        this.unpause();
        this.blocker.style.display = 'none';
      } else {
        this.pause();
        this.blocker.style.display = '-webkit-box';
        this.blocker.style.display = '-moz-box';
        this.blocker.style.display = 'box';

        this.instructions.style.display = '';
      }
    }

    let pointerLockError = () => {
      this.pause();
      this.instructions.style.display = '';
    }

    document.addEventListener( 'pointerlockchange', pointerLockChange, false );
    document.addEventListener( 'mozpointerlockchange', pointerLockChange, false );
    document.addEventListener( 'webkitpointerlockchange', pointerLockChange, false );

    document.addEventListener( 'pointerlockerror', pointerLockError, false );
    document.addEventListener( 'mozpointerlockerror', pointerLockError, false );
    document.addEventListener( 'webkitpointerlockerror', pointerLockError, false );

    this.instructions.addEventListener( 'click', ( event ) => {
      this.instructions.style.display = 'none';
      element.requestPointerLock();
    });
  }

  setupRenderer(){
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor( 0xffffff );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
  }

  setupLevels(){
    // Create the root level
    this.levels = [new Level(this.palette[0], 10)];
    this.levels[0].enableControls();
    this.current_level = 0;

    // And add the next level
    this.appendNewLevel();
  }

  setupDOM(elm){
    this.blocker = document.createElement('div');
    this.blocker.id = 'blocker';

    this.instructions = document.createElement('div');
    this.instructions.id = 'instructions';
    this.instructions.innerHTML = `
      <span style="font-size:40px">Click to play</span>
      <br />
      W, A, S, D = Move, MOUSE = Look around
      <br />
      E = Go To Next Level, Q = Go Back One Level
      <br /> 
      You have to be close to the screen so you can go to next level.
    `;

    this.blocker.appendChild(this.instructions);

    this.hud = document.createElement('div');
    var hudmsg = document.createElement('span');
    hudmsg.innerText = 'Current Level: ';
    this.hudlevel = document.createElement('span');
    this.hudlevel.innerText = '0';
    this.hud.appendChild(hudmsg);
    this.hud.appendChild(this.hudlevel);
    this.hud.id='hud';

    elm.appendChild( this.blocker );
    elm.appendChild( this.hud );
    elm.appendChild( this.renderer.domElement );
  }

  appendNewLevel(){
    var levelId = this.levels.length;
    var color = this.palette[levelId % this.palette.length];
    var size = 10 + 5*levelId;
    var newLevel = new Level(color, size);

    newLevel.disableControls();
    this.levels.push(newLevel);
  }

  pause(){
    this.paused = true;
    this.levels.forEach((level) => level.disableControls());
  }

  unpause(){
    this.paused = false;
    this.levels[this.current_level].enableControls();
    this.hudlevel.innerText = this.current_level;
  }

  goDown(){
    let lastLevel = this.levels.length-1;
    this.current_level++;

    // If we are on the last level
    if(this.current_level == lastLevel){
      this.appendNewLevel();
    }

    this.hudlevel.innerText = this.current_level;
    this.levels[this.current_level-1].disableControls();
    this.levels[this.current_level].enableControls();
  }

  goUp(){
    if(this.current_level == 0) return;

    this.current_level--;

    this.levels[this.current_level+1].disableControls();
    this.levels[this.current_level].enableControls();
  }

  render(){
		var time = performance.now();
		var delta = ( time - this.prevTime ) / 1000;
 
    if(!this.paused) {
      for(var i = this.levels.length-1;i>0;i--){
        this.levels[i].update(delta);
        this.renderer.render(
          this.levels[i].scene,
          this.levels[i].camera,
          this.levels[i-1].computerTexture
        );
      }

      // Update and render root level
      this.levels[0].update(delta);
      this.renderer.render(this.levels[0].scene, this.levels[0].camera);
    }

		this.prevTime = time;
  }

  animate(){
    requestAnimationFrame( ::this.animate );

    this.render();
  }

  onWindowResize(){
    this.levels.forEach((level) => {
      let aspectRatio = window.innerWidth/window.innerHeight
      level.computer.scale.set(1,1/aspectRatio,1);
      level.camera.aspect = window.innerWidth / window.innerHeight;
      level.camera.updateProjectionMatrix();
    })

    this.renderer.setSize( window.innerWidth, window.innerHeight );
  }
}

export default Game;

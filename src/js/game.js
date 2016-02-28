import THREE from 'three';
import Level from './level';

class Game {
  constructor(elm){
		this.prevTime = performance.now();
    this.setupRenderer();
    this.setupLevels();
    this.setupDOM(elm);
    this.setupPointerLock(elm);
    this.pause();

    // This should be events going from levels
    document.addEventListener( 'keypress', ({keyCode})=>{
      // Press e to go down and q to go up
      if(keyCode == 101){
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

  pause(){
    this.paused = true;
    this.levels.forEach((level) => level.disableControls());
  }

  unpause(){
    this.paused = false;
    this.levels[this.current_level].enableControls();
  }

  setupRenderer(){
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor( 0xffffff );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
  }

  setupLevels(){
    this.levels = [new Level()];
    this.levels[0].enableControls();
    this.current_level = 0;
    this.appendNewLevel();
  }

  appendNewLevel(){
    var newLevel = new Level();
    newLevel.disableControls();
    this.levels.push(newLevel);
  }

  setupDOM(elm){
    this.blocker = document.createElement('div');
    this.blocker.id = 'blocker';

    this.instructions = document.createElement('div');
    this.instructions.id = 'instructions';
    this.instructions.innerHTML = `
      <span style="font-size:40px">Click to play</span>
      <br />
      (W, A, S, D = Move, SPACE = Jump, MOUSE = Look around)
    `;

    this.blocker.appendChild(this.instructions);

    elm.appendChild( this.blocker );
    elm.appendChild( this.renderer.domElement );

  }

  goDown(){
    let lastLevel = this.levels.length-1;
    // If there is less than two levels below, add one more level
    if(this.current_level >= lastLevel-1){
      this.appendNewLevel();
    }
    this.current_level++;
    this.pause();
    this.unpause();
  }

  goUp(){
    this.current_level--;
    this.pause();
    this.unpause();
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
      level.camera.aspect = window.innerWidth / window.innerHeight;
      level.camera.updateProjectionMatrix();
    })

    this.renderer.setSize( window.innerWidth, window.innerHeight );
  }
}

export default Game;

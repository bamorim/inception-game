import THREE from 'three';
import PointerLockControls from './PointerLockControls';
import maze from './maze';

function makeFloorMesh(){
	var geometry = new THREE.PlaneGeometry( 2000, 2000, 100, 100 );
	var material = new THREE.MeshPhongMaterial( { color: 0x444444, specular: 0x009900, shininess: 30, shading: THREE.SmoothShading, transparent: true } );
	geometry.rotateX( - Math.PI / 2 );

	return new THREE.Mesh( geometry, material );
}

let wallLength = 22;
let wallHeight = 20;
let wallWidth = 2;


class Level {
  constructor(color, size){
    this.color = color || 0xff6666;
    this.size = size;
    this.setupCamera();
    this.setupScene();
    this.setupControls();
    this.setupTime();
    this.setupVelocity();
  }

  setupTime(){
    this.prevTime = performance.now();
  }

  setupVelocity(){
    this.velocity = new THREE.Vector3();
  }

  setupCamera(){
	  this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
  }

  setupScene(){
    this.walls = [];
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog( 0xffffff, 0, 750 );

    var light = new THREE.HemisphereLight( 0xffffff, 0x777788, 0.75 );
    light.position.set( 0.5, 1, 0.75 );
    this.scene.add( light );

    this.scene.add( makeFloorMesh() );

    // Add the surroundings
    for ( var i = 0; i < this.size; i++ ){
      this.addXWall(i,-1);
      this.addXWall(i,this.size - 1);

      this.addZWall(0,i-1);
      this.addZWall(this.size ,i-1);
    }

    // Add the inner walls
    let {horiz, verti} = maze(this.size, this.size);
    for ( var i = 0; i < this.size; i++ ){
      for ( var j = 0; j < this.size-1; j++) {
        if(!horiz[i][j]){
          this.addXWall(i,j);
        }

        if(!verti[j][i]){
          this.addZWall(j+1,i-1);
        }
      }
    }

    // Add the Computer
    this.computerTexture = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter}); 

    var computerMaterial = new THREE.MeshBasicMaterial({map: this.computerTexture});
    var computerGeometry = new THREE.BoxGeometry(15,15,15);
    this.computer = new THREE.Mesh(computerGeometry,computerMaterial); 

    let aspectRatio = window.innerWidth/window.innerHeight;
    this.computer.scale.set(1,1/aspectRatio,1);

    this.computer.position.z = -9*wallLength;
    this.computer.position.x = -9*wallLength;
    this.computer.position.y = 10;
    this.scene.add(this.computer)
  }

  isNearBox(){
    let dist = this.computer.position.distanceTo(this.camera.getWorldPosition());
    return dist < 15;
  }

  setupControls(){
    this.controls = new PointerLockControls( this.camera );
    this.scene.add( this.controls.getObject() );

    var onKeyDown = ( event ) => {

      switch ( event.keyCode ) {

        case 38: // up
          case 87: // w
          this.controls.moveForward = true;
        break;

        case 37: // left
          case 65: // a
          this.controls.moveLeft = true; 
        break;

        case 40: // down
          case 83: // s
          this.controls.moveBackward = true;
        break;

        case 39: // right
          case 68: // d
          this.controls.moveRight = true;
        break;

      }

    };

    var onKeyUp = ( event ) => {

      switch( event.keyCode ) {

        case 38: // up
          case 87: // w
          this.controls.moveForward = false;
        break;

        case 37: // left
          case 65: // a
          this.controls.moveLeft = false;
        break;

        case 40: // down
          case 83: // s
          this.controls.moveBackward = false;
        break;

        case 39: // right
          case 68: // d
          this.controls.moveRight = false;
        break;

      }

    };

    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );
  }

  enableControls(){
    this.controls.enabled = true;
  }

  disableControls(){
    this.controls.enabled = false;
  }

  update(delta){
    if (!this.controls.enabled) return;

    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;

    if ( this.controls.moveForward ) this.velocity.z -= 400.0 * delta;
    if ( this.controls.moveBackward ) this.velocity.z += 400.0 * delta;

    if ( this.controls.moveLeft ) this.velocity.x -= 400.0 * delta;
    if ( this.controls.moveRight ) this.velocity.x += 400.0 * delta;

    var camobject = this.controls.getObject();

    var p1 = xzpos(camobject);

    camobject.translateX( this.velocity.x*delta );
    camobject.translateZ( this.velocity.z*delta );

    var p2 = xzpos(camobject);

    var intersects = this.walls.filter(wallContaining(p2.x,p2.z));
    if(intersects.length == 0) return; // No colisions

    // Allow 'sliding' on X and Z by removing only one movement axis
    if(intersects.filter(wallContaining(p2.x,p1.z)).length == 0){
      this.velocity.x = 0;
      camobject.position.z = p1.z;
    } else if(intersects.filter(wallContaining(p1.x,p2.z)).length == 0){
      this.velocity.z = 0;
      camobject.position.x = p1.x;
    } else {
      this.velocity.x = 0;
      camobject.position.x = p1.x;
      this.velocity.z = 0;
      camobject.position.z = p1.z;
    }
  }

  addWall(x,z,dx,dz){
    var geometry = new THREE.BoxGeometry( dx, wallHeight, dz );
    var material = new THREE.MeshPhongMaterial( { color: this.color, specular: 0x009900, shininess: 30, shading: THREE.SmoothShading, transparent: true } );
    var mesh = new THREE.Mesh( geometry, material );

    mesh.position.x = -1 * x;
    mesh.position.y = 10;
    mesh.position.z = -1 * z;

    this.scene.add(mesh);
    var wbox = wallBox(mesh);
    this.walls.push(wbox);

    return mesh;
  }

  addXWall(x,z){
    return this.addWall(x*wallLength, z*wallLength+wallLength/2, wallLength, wallWidth);
  }

  addZWall(x,z){
    return this.addWall(x*wallLength-wallLength/2, z*wallLength+wallLength, wallWidth, wallLength);
  }
}

// Helper functions used in "collision" detection
function wallContaining(x,z){
  let D = 3;

  return function(w){
    return w.min.x-D <= x && w.min.z-D <= z && w.max.x+D >= x && w.max.z+D >= z; 
  }
}

function wallBox(w){
  w.geometry.computeBoundingBox();
  return w.geometry.boundingBox.clone().translate(w.getWorldPosition());
}

function xzpos(obj){
  var pos = obj.position;
  return {x: pos.x, z: pos.z};
}

export default Level;

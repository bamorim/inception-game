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

function makeWall(x,z,dx,dz){
	var geometry = new THREE.BoxGeometry( dx, wallHeight, dz );
	var material = new THREE.MeshPhongMaterial( { color: 0xff6666, specular: 0x009900, shininess: 30, shading: THREE.SmoothShading, transparent: true } );
	var mesh = new THREE.Mesh( geometry, material );

	mesh.position.x = -1 * x;
	mesh.position.y = 10;
	mesh.position.z = -1 * z;

	return mesh;
}

function makeXWall(x,z){
	return makeWall(x*wallLength, z*wallLength+wallLength/2, wallLength, wallWidth);
}

function makeZWall(x,z){
	return makeWall(x*wallLength-wallLength/2, z*wallLength+wallLength, wallWidth, wallLength);
}

class Level {
  constructor(){
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
    for ( var i = 0; i < 10; i++ ){
      this.scene.add( makeXWall(i,-1) );
      this.scene.add( makeXWall(i,9) );

      this.scene.add( makeZWall(0,i-1) );
      this.scene.add( makeZWall(10,i-1) );
    }

    // Add the inner walls
    let {horiz, verti} = maze(10,10);
    for ( var i = 0; i < 10; i++ ){
      for ( var j = 0; j < 9; j++) {
        if(!horiz[i][j]){
          let wall = makeXWall(i,j);
          this.walls.push(wall);
          this.scene.add( wall );
        }

        if(!verti[j][i]){
          let wall = makeZWall(j+1,i-1);
          this.walls.push(wall);
          this.scene.add( wall );
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

    this.raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );
  }

  enableControls(){
    this.controls.enabled = true;
  }

  disableControls(){
    this.controls.enabled = false;
  }

  update(delta){
    if ( this.controls.enabled ) {
      this.raycaster.ray.origin.copy( this.controls.getObject().position );


      this.velocity.x -= this.velocity.x * 10.0 * delta;
      this.velocity.z -= this.velocity.z * 10.0 * delta;

      if ( this.controls.moveForward ) this.velocity.z -= 400.0 * delta;
      if ( this.controls.moveBackward ) this.velocity.z += 400.0 * delta;

      if ( this.controls.moveLeft ) this.velocity.x -= 400.0 * delta;
      if ( this.controls.moveRight ) this.velocity.x += 400.0 * delta;

      function xzpos(obj){
        var pos = obj.position;
        return {x: pos.x, z: pos.z};
      }

      var camobject = this.controls.getObject();

      var p1 = xzpos(camobject);

      camobject.translateX( this.velocity.x*delta );
      camobject.translateZ( this.velocity.z*delta );

      var p2 = xzpos(camobject);

      var segment = { p1, p2 };

      function segmentColliding(s1, s2){
				return lineIntersect(s1.p1.x,s1.p1.z, s1.p2.x,s1.p2.z, s2.p1.x,s2.p1.z, s2.p2.x,s2.p2.z);
      }

      this.walls.forEach((wall) => {
        getWallSegments(wall).map((w_seg) => {
          if(segmentColliding(w_seg,segment)){
            if(w_seg.p1.z == w_seg.p2.z){
              camobject.position.z = segment.p1.z;
            } else {
              camobject.position.x = segment.p1.x;
            }
          }
        });
      });
    }
  }
}


function lineIntersect(x1,y1,x2,y2, x3,y3,x4,y4) {
    var x=((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
    var y=((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
    if (isNaN(x)||isNaN(y)) {
        return false;
    } else {
        if (x1>x2) {
            if (!(x2<=x&&x<=x1)) {return false;}
        } else {
            if (!(x1<=x&&x<=x2)) {return false;}
        }
        if (y1>y2) {
            if (!(y2<=y&&y<=y1)) {return false;}
        } else {
            if (!(y1<=y&&y<=y2)) {return false;}
        }
        if (x3>x4) {
            if (!(x4<=x&&x<=x3)) {return false;}
        } else {
            if (!(x3<=x&&x<=x4)) {return false;}
        }
        if (y3>y4) {
            if (!(y4<=y&&y<=y3)) {return false;}
        } else {
            if (!(y3<=y&&y<=y4)) {return false;}
        }
    }
    return true;
}

window.lineIntersect = lineIntersect;

function getWallSegments(wall){
  let { x, z } = wall.position;
  let { width, depth } = wall.geometry.parameters;

  let p1 = { x: x+width/2+2, z: z+depth/2+2 };
  let p2 = { x: x-width/2-2, z: z+depth/2+2 };
  let p3 = { x: x+width/2+2, z: z-depth/2-2 };
  let p4 = { x: x-width/2-2, z: z-depth/2-2 };

  return [
    {p1: p1, p2: p2},
    {p1: p1, p2: p3},
    {p1: p2, p2: p4},
    {p1: p3, p2: p4}
  ];
}

export default Level;

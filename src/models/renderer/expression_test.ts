import { SequenceLogger } from "../../logging/sequence_logger";
import { RenderObject } from "../../renderer/renderer";
import { RenderModel } from "../../renderer/render_model";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
const {KalmanFilter} = require('kalman-filter');

import {
    SkinnedMesh,
    WebGLRendererParameters
  } from 'three';
import { Helper } from "../../etc/helper";

export class ExpressionTest implements RenderModel{

  domRenderer : HTMLCanvasElement = document.createElement('canvas');
  private width = 320;
  private height = 180;
  private scene : THREE.Scene;
  private renderer : THREE.WebGLRenderer;
  private camera : THREE.PerspectiveCamera;
  private group : THREE.Object3D;
  private character : THREE.Group;
  private rotation_o : THREE.Quaternion;
  private scale_o : any;
  private matrixX : any = [];

  private loadModel(file : string) :  Promise<THREE.Group>{
    return new Promise( ( res, rej ) => {
        const loader = new GLTFLoader();
        loader.setPath('https://s-test-allright-io.s3.eu-central-1.amazonaws.com/avatars/');
        loader.load("monkey.glb", function ( gltf ) {
            const scene = gltf.scene;
            scene.scale.set(0.6, 0.6, 0.5);
          res(gltf.scene);
        });		
    });
  }

  private async loadCharacter(){
    this.character = await this.loadModel( '../assets/character_rigged.gltf' );
    //const size = new THREE.Box3().setFromObject(this.character).getSize(new THREE.Vector3());  
    //this.character.name = 'character';
    this.group.add(this.character);
   // this.character.scale.set(1/size.x,1/size.x,1/size.x);

  }

  constructor(){


      this.group = new THREE.Group();
      this.group.matrixAutoUpdate = false;
     // this.group.add(this.character);


      const geometry = new THREE.BoxGeometry( 1, 1, 1);
      const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
      const cube = new THREE.Mesh( geometry, material );
      //this.group.add( cube );

    
      this.domRenderer.width = this.width;
      this.domRenderer.height = this.height;
      this.scene = new THREE.Scene();
      this.renderer = new THREE.WebGLRenderer({
          canvas: this.domRenderer,
          antialias : true,
          devicePixelRation: window.devicePixelRatio || 1
      } as WebGLRendererParameters);

      this.renderer.setClearColor( 0xffffff );
      this.renderer.shadowMap.enabled = true;

      this.renderer.outputEncoding = THREE.sRGBEncoding;

      const loader = new THREE.TextureLoader();
      loader.load('../assets/background.png' , (texture) => {
        this.scene.background = texture;
      });

      this.camera = new THREE.PerspectiveCamera(63, this.width / this.height, 1, 10000);
      this.renderer.setSize(this.width, this.height);

      
      const light = new THREE.HemisphereLight(0xffeeb1, 0x080820, 2); 
      this.scene.add(light);
      this.scene.add(this.group);
      this.loadCharacter();

  }

  customPerformanceMeasurement(meter: SequenceLogger, renderObject: RenderObject): boolean {
      return false;
  }

  init(data: any): void {}

 

  renderFrame(renderObject: RenderObject): void {
    let landmarks = Helper.scaleLandmarks(renderObject.data.landmarks, 320, 180);
    let translation = renderObject.data.translation;

  

    if (landmarks != null){

        this.matrixX.push(translation);
        if (this.matrixX.length > 3){
          this.matrixX.shift();
        }
        const kFilter = new KalmanFilter({observation: 16 });
        let nmatrixX = kFilter.filterAll(this.matrixX);
        this.matrixX = nmatrixX;
        nmatrixX[1] && this.group.matrix.fromArray( nmatrixX[1]);


      ///this.group.clear();
     // this.alignModel(landmarks);
     // this.group.matrix.fromArray(translation)
      //this.animate(landmarks);


      
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  private animate(landmarks : any){
    const mouthTop = landmarks[13];
    const mouthBottom = landmarks[14];
    const mouthRightTop = landmarks[415];
    const mouthRightBottom = landmarks[324];
    const eyeBrownBottom =landmarks[105];
    const eyeBrownTop = landmarks[67];
    const eyeTop = landmarks[145];
    const eyeBottom = landmarks[159];
    const scale = Helper.getScale(landmarks);
    
    const eyeDistance = (this.getDistance(eyeTop, eyeBottom)/scale - 0.04)/0.04;
    const openBrownDistance = 1-((this.getDistance(eyeBrownTop, eyeBrownBottom)/scale-0.17)/0.065);
    const openMouthDistance = ((this.getDistance(mouthTop, mouthBottom) - this.getDistance(mouthRightBottom, mouthRightTop))/scale)/0.15;


    const boneMouthBottom = this.character.getObjectByName('Bone');
    boneMouthBottom.rotation.z = -0.2 - 0.65*openMouthDistance;

    const boneEyeBrown1 = this.character.getObjectByName('Bone005');
    boneEyeBrown1.position.y = 0.101 + openBrownDistance*0.02 ;
    const boneEyeBrown2 = this.character.getObjectByName('Bone006');
    boneEyeBrown2.position.y = 0.101 + openBrownDistance*0.02 ;

    const boneEyeLeft = this.character.getObjectByName('Bone007');
    boneEyeLeft.scale.y = 1 + (1-eyeDistance) * -2;

    const boneEyeRight = this.character.getObjectByName('Bone008');
    boneEyeRight.scale.y = 1 + (1-eyeDistance) * -2;
  }

    private getDistance(v1 : THREE.Vector3, v2 : THREE.Vector3){
      return Math.sqrt((v1.x - v2.x)**2 + (v1.y-v2.y)**2 + (v1.z-v2.z)**2);
    }

    private getLowPassQuaternion(last : THREE.Quaternion, current : THREE.Quaternion, threshold : number) : THREE.Quaternion{
      if(last == null)
        return current;
        
        current.w = threshold * last.w + (1-threshold) * current.w;
        current.x = threshold * last.x + (1-threshold) * current.x;
        current.y = threshold * last.y + (1-threshold) * current.y;
        current.z = threshold * last.z + (1-threshold) * current.z;

        return current;
    }

    private getLowPassVector(last : THREE.Vector3, current : THREE.Vector3, threshold : number) : THREE.Vector3{
      if(last == null)
        return current;

        current.x = threshold * last.x + (1-threshold) * current.x;
        current.y = threshold * last.y + (1-threshold) * current.y;
        current.z = threshold * last.z + (1-threshold) * current.z;

        return current;
    }
    
    private alignModel(landmarks : any){      
      //normalize
      this.group.rotation.x = 0;
      this.group.rotation.y = 0;
      this.group.rotation.z = 0;

      //rotation
      const rotation = this.getLowPassQuaternion(this.rotation_o, Helper.getRotation(landmarks), 0.5);
      this.rotation_o = rotation;
      //this.group.applyQuaternion(rotation);

      //scale
      const scale = Helper.getScale(landmarks);
      //this.group.scale.copy(this.getLowPassVector(new THREE.Vector3().addScalar(this.scale_o), new THREE.Vector3().addScalar(scale), 0.5));

      this.scale_o = scale;

      //translate
      const translation = Helper.getTranslation(landmarks);
      //this.group.position.copy(translation);


}

    destruct(): void {}
    
}
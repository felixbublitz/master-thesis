import { SequenceLogger } from "../../logging/sequence_logger";
import { RenderObject } from "../../renderer/renderer";
import { RenderModel } from "../../renderer/render_model";
import * as THREE from 'three';
const {KalmanFilter} = require('kalman-filter');
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'


import {
    BufferGeometry,
    Float32BufferAttribute,
    Matrix4,
    MeshBasicMaterial,
    WebGLRendererParameters
  } from 'three';

  import { 
    FACE_MESH_INDEX_BUFFER, 
    FACE_MESH_UV  
  } from '../../etc/face_geom.js';
import { Helper } from "../../etc/helper";
import { EncodableArray, EncodableCoordinates } from "../../encoding/types";
import { degToRad } from "three/src/math/MathUtils";
  


export class ExpressionTransferRenderModel2 implements RenderModel{

    domRenderer : HTMLCanvasElement;
    private width = 320;
    private height = 180;
    private scene : THREE.Scene;
    private group : THREE.Object3D;

    private renderer : THREE.WebGLRenderer;
    private camera : THREE.PerspectiveCamera;
    private faces : THREE.Object3D;
    private material : MeshBasicMaterial;
    private character : THREE.Group;
    private character2 : THREE.Object3D;
    private cube : THREE.Object3D;

    private matrixX : any = [];

    constructor(){
      this.domRenderer = document.createElement('canvas');
      this.domRenderer.width = this.width;
      this.domRenderer.height = this.height;
      
      this.group = new THREE.Group();
      //this.group.matrixAutoUpdate = false;


        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.domRenderer,
            antialias : true,
            devicePixelRation: window.devicePixelRatio || 1
        } as WebGLRendererParameters);

        this.renderer.setClearColor( 0xffffff );

        const loader = new THREE.TextureLoader();
        loader.load('../assets/portrait.jpg' , (texture) => {
          this.scene.background = texture;
        });
     

        var textureLoader = new THREE.TextureLoader();
        textureLoader.load('../assets/texture.jpg', (texture) => {
          console.log('texture loaded');
          texture.center = new THREE.Vector2(0.5,0.5);
          texture.rotation = Math.PI;
          this.material = new THREE.MeshBasicMaterial( {map: texture });

        });

        this.camera = new THREE.PerspectiveCamera(63, this.width / this.height, 1, 10000);
        this.camera.position.z = 30;
        this.camera.position.y = 2;
        this.camera.position.x = -1;


        this.renderer.setSize(this.width, this.height);
  

        const geometry = new THREE.BoxGeometry( 1, 1, 1);
        const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
        this.cube = new THREE.Mesh( geometry, material );
        this.cube.matrixAutoUpdate = false;
        //this.group.add(this.cube );

        this.scene.add(this.group)
        this.loadCharacter();

    }

    private loadModel(file : string) :  Promise<THREE.Group>{
      return new Promise( ( res, rej ) => {
          const loader = new GLTFLoader();
          //loader.setPath('https://s-test-allright-io.s3.eu-central-1.amazonaws.com/avatars/');
          loader.load("../assets/mask.gltf", function ( gltf ) {
              const scene = gltf.scene;
              scene.scale.set(1.5, 1.5, 1.5);
              
            res(gltf.scene);
          });		
      });
    }
  
    private async loadCharacter(){
      this.character = await this.loadModel( '../assests/character_rigged.gltf' );

      this.character2 = new THREE.Mesh((this.character.children[0] as THREE.Mesh).geometry, this.material);

      //const size = new THREE.Box3().setFromObject(this.character).getSize(new THREE.Vector3());  
      //this.character.name = 'character';
      this.group.add(this.character2);
     // this.character.scale.set(1/size.x,1/size.x,1/size.x);
  
    }

    customPerformanceMeasurement(meter: SequenceLogger, renderObject: RenderObject): boolean {
        return false;
    }

    init(data: any): void {}

    renderFrame(renderObject: RenderObject): void {
        let landmarks = renderObject.data.landmarks;
        let translation = renderObject.data.translation;


        if (this.faces != null) this.scene.remove(this.faces);
        if (landmarks != null) this.addFaces(landmarks, translation);
        this.renderer.render(this.scene, this.camera);

    }
    
    private addFaces(landmarks : any, translation : any){


      const originTranslation = [
        0.9959584474563599,
        0.007834291085600853,
        0.08947083353996277,
        0,
        -0.011436737142503262,
        0.9991409182548523,
        0.03982246667146683,
        0,
        -0.08908203989267349,
        -0.040684930980205536,
        0.9951930046081543,
        0,
        1.7411861419677734,
        -2.4739112854003906,
        -29.83755111694336,
        1
    ];

      //this.group.remove(this.faces);
      this.matrixX.push(translation);
      if (this.matrixX.length > 3){
        this.matrixX.shift();
      }
      const kFilter = new KalmanFilter({observation: 16 });
      let nmatrixX = kFilter.filterAll(this.matrixX);
      this.matrixX = nmatrixX;
      
      const originMatrix = new Matrix4().fromArray(originTranslation);
      //n.invert();


      let oTranslation = new THREE.Vector3(),
  oRotation = new THREE.Quaternion(),
  oScale = new THREE.Vector3();
  originMatrix.decompose(oTranslation, oRotation, oScale);




      //let translation2 = translation1.multiplyScalar(-1);




      this.group.matrix.setPosition(oTranslation);
      this.group.scale.set(oScale.x,oScale.y,1);
      //this.group.rotation.setFromQuaternion(oRotation);

      
      //his.cube.rotation.set(rotation);

      //let tt = translation1.multiplyScalar(0.1);

      //this.group.scale.set(scale1.x, scale1.y, scale1.z);
     // this.group.rotation.setFromQuaternion(rotation1);

     // this.group.position.set(translation1.x, translation1.y, translation1.z);

      //this.group.matrix = m.invert();


      let geometry = this.makeGeometry(landmarks);
      
      this.faces = new THREE.Mesh(geometry, this.material);
      //his.faces.scale.copy(new THREE.Vector3(0.8,0.8,0.8));
      const size = new THREE.Box3().setFromObject(this.faces).getSize(new THREE.Vector3());  
      console.log(size.x);
      //this.group.add(this.faces);

      /*
        const translationMatrix = new THREE.Matrix4();
        translationMatrix.fromArray(translation);

        ;
        this.faces = new THREE.Mesh(geometry, this.material);
        //this.faces.matrixAutoUpdate = false;

        this.matrixX.push(translation);
        if (this.matrixX.length > 3){
          this.matrixX.shift();
        }
        const kFilter = new KalmanFilter({observation: 16 });
        let nmatrixX = kFilter.filterAll(this.matrixX);
        this.matrixX = nmatrixX;
        nmatrixX[1] && this.faces.matrix.fromArray( nmatrixX[1]);


*/
        const scaledLandmarks =  Helper.scaleLandmarks(landmarks, 320, 180);

        
    
        //translationMatrix.invert();



        //this.faces.matrix = translationMatrix.invert();

      //  this.faces.scale.copy(new THREE.Vector3(this.width, this.height, this.width));
        //this.faces.position.copy(Helper.getTranslation(scaledLandmarks).multiplyScalar(-1));


        //this.scene.add(this.faces);
    }

    private makeGeometry = (landmarks : Array<any>) => {
        let geometry = new BufferGeometry();
        let vertices = [];
        let uvs = [];

        for(let i = 0; i < landmarks.length; i++) {
          const coordinates = landmarks[i];

          //point.multiply(trans.invert());
          let vertex =  [coordinates.x, coordinates.y, coordinates.z];
          vertices.push(...vertex);
        }

        for (let j = 0; j < landmarks.length; j++) {
          uvs[j * 2] = FACE_MESH_UV[j][0];
          uvs[j * 2 + 1] = FACE_MESH_UV[j][1];
        }
      
        geometry.setIndex(FACE_MESH_INDEX_BUFFER);
        geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
        geometry.computeVertexNormals();
      
        return geometry;
      }

    destruct(): void {}
    
}

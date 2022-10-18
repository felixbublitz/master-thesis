import { SequenceLogger } from "../../logging/sequence_logger";
import { RenderObject } from "../../renderer/renderer";
import { RenderModel } from "../../renderer/render_model";
import * as THREE from 'three';
const {KalmanFilter} = require('kalman-filter');


import {
    BufferGeometry,
    Float32BufferAttribute,
    Matrix4,
    MeshBasicMaterial,
    WebGLRendererParameters
  } from 'three';

  import { 
    FACE_MESH_EYE_R_INDEX_BUFFER,
    FACE_MESH_INDEX_BUFFER, 
    FACE_MESH_UV  
  } from '../../etc/face_geom.js';
import { Helper } from "../../etc/helper";



export class FaceswapRenderModel implements RenderModel{

    domRenderer : HTMLCanvasElement;
    private scene : THREE.Scene;
    private group : THREE.Object3D;
    private eye : THREE.Object3D;

    private renderer : THREE.WebGLRenderer;
    private camera : THREE.PerspectiveCamera;
    private faces : THREE.Object3D;
    private material : MeshBasicMaterial;
    private eyeMaterial : MeshBasicMaterial;

    private cube : THREE.Object3D;

    private matrixX : any = [];

    constructor(width: number, height: number){
      this.domRenderer = document.createElement('canvas');
      this.domRenderer.width = width;
      this.domRenderer.height = height;
      
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
        loader.load('../assets/img/near-blurred.jpg' , (texture) => {
          this.scene.background = texture;
        });
     

        var textureLoader = new THREE.TextureLoader();
        textureLoader.load('../assets/texture/alpha-map.jpg', (alphaMap) => {

          alphaMap.flipY = false;

        textureLoader.load('../assets/texture/near-texture.png', (texture) => {
          console.log('texture loaded');
          const t2 = texture.clone();
          //texture.center = new THREE.Vector2(0.7,0.7);
          //texture.rotation = Math.PI;
          texture.flipY = false;
          //texture.offset = new THREE.Vector2(0,0);
          this.material = new THREE.MeshBasicMaterial( {map: texture, alphaMap : alphaMap, transparent: true });
          this.eyeMaterial = new THREE.MeshBasicMaterial( {map: t2});

        });
      });



        this.camera = new THREE.PerspectiveCamera(63, width / height, 1, 10000);
        this.camera.position.z = 30;
        this.camera.position.y = 2.6;
        this.camera.position.x = -1.6;

        this.renderer.setPixelRatio( window.devicePixelRatio);

        this.renderer.setSize(width, height);
  

        const geometry = new THREE.BoxGeometry( 1, 1, 1);
        const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
        this.cube = new THREE.Mesh( geometry, material );
        this.cube.matrixAutoUpdate = false;

        this.scene.add(this.group)

    }


    customPerformanceMeasurement(meter: SequenceLogger, renderObject: RenderObject): boolean {
        return false;
    }

    init(data: any): void {}

    renderFrame(renderObject: RenderObject): void {
        let landmarks = renderObject.data.landmarks;
        let translation = renderObject.data.translation;


        if (this.faces != null) this.scene.remove(this.faces);
        if (landmarks != null) this.addFaces(landmarks);

      /*  if(this.eye == null){
        const eyeGeo = new THREE.SphereGeometry( 2, 32, 16 );
        var textureLoader = new THREE.TextureLoader();

        
      textureLoader.load('../assets/eye.png', (texture) => {
        console.log('texture loaded');
        texture.center = new THREE.Vector2(0.5,0.5);
        const material = new THREE.MeshBasicMaterial( {map: texture,  });

        this.eye = new THREE.Mesh( eyeGeo, material );
        this.scene.add(this.eye );
      });


        }
        this.eye.rotation.y = -Math.PI/2;
       
*/
this.eye.position.set(landmarks[159].x,(landmarks[159].y - Math.abs(landmarks[159].y-landmarks[145].y))+0.5, -2)
        this.renderer.render(this.scene, this.camera);

    }
    
    private addFaces(landmarks : any){


      const nearTranslation = [
    0.9994773864746094,
    -0.03229370713233948,
    -0.0014988075708970428,
    0,
    0.03230658546090126,
    0.999432384967804,
    0.009564902633428574,
    0,
    0.0011890719179064035,
    -0.00960841216146946,
    0.9999532699584961,
    0,
    3.275362968444824,
    -4.121068954467773,
    -46.080841064453125,
    1
]

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

      this.group.remove(this.faces);
      //this.scene.remove(this.eye);
      
      const originMatrix = new Matrix4().fromArray(nearTranslation);

      let oTranslation = new THREE.Vector3(),
      oRotation = new THREE.Quaternion(),
      oScale = new THREE.Vector3();
      originMatrix.decompose(oTranslation, oRotation, oScale);


      

      let geometry = this.makeGeometry(landmarks);
      
      this.faces = new THREE.Mesh(geometry, this.material);
      this.faces.matrixAutoUpdate = true;
      const size = new THREE.Box3().setFromObject(this.faces).getSize(new THREE.Vector3());  

      this.faces.scale.set(0.63,0.63,1);
      
      this.faces.matrix.setPosition(oTranslation);
      this.group.scale.set(oScale.x,oScale.y,1);

      let uv :any = [];
      uv[0] = 0.2;
      uv[1] = 0.69;
   
      uv[2] = 0.5;
      uv[3] = 0.69;
   
      uv[4] = 0.2;
      uv[5] = 0.56;
   
      uv[6] = 0.5;
      uv[7] = 0.56;
         
      var geo = new THREE.PlaneBufferGeometry(6.9, 3, 1, 1);
      geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));


      this.eye = new THREE.Mesh(geo, this.eyeMaterial);


      const scaledLandmarks =  Helper.scaleLandmarks(landmarks, 320, 180);


     
    // this.scene.add(this.eye);
      this.group.add(this.faces);
    }

  
    private makeGeometry = (landmarks : Array<any>) => {
        let geometry = new BufferGeometry();
        let vertices = [];
        let uvs = [];


        let closeFactor = Helper.getDistance(landmarks[159],landmarks[145])/Helper.getScale(landmarks[234],landmarks[454]);
        closeFactor = 1-Math.max(0,Math.min(1,(closeFactor-0.037)/0.022));
        //console.log(closeFactor);

        const landmarkPairs = [[246,7],[161,163],[160,144],[159,145],[158,153],[157,154],[173,155],[398,382],[384,381],[385,380],[386,374],[387,373],[388,390],[466,249]];

        for(let i=0;i<landmarkPairs.length;i++){
          const lA = landmarkPairs[i][0];
          const lB = landmarkPairs[i][1];
          const closeDist = Helper.getDistance(landmarks[lA],landmarks[lB]);
          landmarks[lA].y = landmarks[lA].y - closeFactor * closeDist;
        }

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

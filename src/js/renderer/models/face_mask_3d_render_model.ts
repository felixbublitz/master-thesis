import { PerformanceMeter } from "../../measuring/performance";
import { RenderObject } from "../renderer";
import { RenderModel } from "./render_model";
import * as THREE from 'three';
import {
    BufferGeometry,
    Float32BufferAttribute,
    MeshBasicMaterial,
    WebGLRendererParameters
  } from 'three';

  import { 
    FACE_MESH_INDEX_BUFFER, 
    FACE_MESH_UV  
  } from '../../mediapipe/face_geom.js';
import { Helper } from "../../mediapipe/helper";
import { EncodableArray, EncodableCoordinates } from "../../encoding/types";
  


export class FaceMask3DRenderModel implements RenderModel{

    domRenderer : HTMLCanvasElement;
    private width = 320;
    private height = 180;
    private scene : THREE.Scene;
    private renderer : THREE.WebGLRenderer;
    private camera : THREE.OrthographicCamera;
    private faces : THREE.Object3D;
    private material : MeshBasicMaterial;


    constructor(){
      this.domRenderer = document.createElement('canvas');
      this.domRenderer.width = this.width;
      this.domRenderer.height = this.height;
      


        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.domRenderer,
            antialias : true,
            devicePixelRation: window.devicePixelRatio || 1
        } as WebGLRendererParameters);

        this.renderer.setClearColor( 0xffffff );

        const loader = new THREE.TextureLoader();
        loader.load('../assets/background.png' , (texture) => {
          this.scene.background = texture;
        });
     

        var textureLoader = new THREE.TextureLoader();
        textureLoader.load('../assets/texture.jpg', (texture) => {
          console.log('texture loaded');
          texture.center = new THREE.Vector2(0.5,0.5);
          texture.rotation = Math.PI;
          this.material = new THREE.MeshBasicMaterial( {map: texture });

        });

        this.camera = new THREE.OrthographicCamera(
            - this.renderer.domElement.width / 2,
            this.renderer.domElement.width / 2,
            this.renderer.domElement.height / 2,
            - this.renderer.domElement.height / 2,
            -2000, 
            2000
          )
          this.camera.position.z = 1

    }

    customPerformanceMeasurement(meter: PerformanceMeter, renderObject: RenderObject): boolean {
        return false;
    }

    init(data: any): void {}

    renderFrame(renderObject: RenderObject): void {
        let landmarks = renderObject.data.data;
        if (this.faces != null) this.scene.remove(this.faces);
        if (landmarks != null) this.addFaces(landmarks);
        this.renderer.render(this.scene, this.camera);

    }
    
    private addFaces(landmarks : any){
        let geometry = this.makeGeometry(landmarks);
        this.faces = new THREE.Mesh(geometry, this.material);

        const scaledLandmarks =  Helper.scaleLandmarks(landmarks, 320, 180);

        this.faces.applyQuaternion(Helper.getRotation(scaledLandmarks).invert());

        this.faces.scale.copy(new THREE.Vector3(this.width/2, this.height/2, this.width/2).multiplyScalar(2));
        this.faces.position.copy(Helper.getTranslation(scaledLandmarks).multiplyScalar(-1));


        this.scene.add(this.faces);
    }

    private makeGeometry = (landmarks : EncodableArray) => {
        let geometry = new BufferGeometry();
        let vertices = [];
        let uvs = [];

        for(let i = 0; i < landmarks.length; i++) {
          const coordinates = landmarks.getValue(i);
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
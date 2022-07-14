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
  } from './face_geom.js';
import { Coordinates } from "../../encoding/types";
  


export class FaceMask3DRenderModel implements RenderModel{

    domRenderer : HTMLCanvasElement = document.createElement('canvas');
    private width = 320;
    private height = 240;
    private scene : THREE.Scene;
    private renderer : THREE.WebGLRenderer;
    private camera : THREE.OrthographicCamera;
    private faces : any;
    private material : MeshBasicMaterial;


    constructor(){
        this.domRenderer.width = this.width;
        this.domRenderer.height = this.height;
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.domRenderer,
            devicePixelRation: window.devicePixelRatio || 1
        } as WebGLRendererParameters);

        this.renderer.setClearColor( 0xffffff );


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
        this.faces.position.set(0, 0, 0);
        this.faces.scale.set(this.width, this.height, this.width);
        this.scene.add(this.faces);
    }

    private makeGeometry = (landmarks : Array<Coordinates>) => {
        let geometry = new BufferGeometry();
        let vertices = [];
        let uvs = [];
      

        for(let i = 0; i < landmarks.length; i++) {
          let {x, y, z} = landmarks[i];
          let vertex =  [x, y, z];
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
import { SequenceLogger } from "../../logging/sequence_logger";
import { RenderObject } from "../../renderer/renderer";
import { RenderModel } from "../../renderer/render_model";
import * as THREE from 'three';

import {
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  MeshBasicMaterial,
  WebGLRendererParameters
} from 'three';

import {
  FACE_MESH_INDEX_BUFFER,
  FACE_MESH_UV,
  TRANSFORMATION_PORTRAIT_IMAGE
} from '../../etc/face_geom.js';
import { Helper } from "../../etc/helper";

export class FaceswapRenderModel implements RenderModel {

  domRenderer: HTMLCanvasElement;
  private scene: THREE.Scene;
  private group: THREE.Object3D;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private faces: THREE.Object3D;
  private material: MeshBasicMaterial;

  constructor(width: number, height: number) {
    this.domRenderer = document.createElement('canvas');
    this.domRenderer.width = width;
    this.domRenderer.height = height;
    this.group = new THREE.Group();
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.domRenderer,
      antialias: true,
      devicePixelRation: window.devicePixelRatio || 1
    } as WebGLRendererParameters);
    this.renderer.setClearColor(0xffffff);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);

    this.camera = new THREE.PerspectiveCamera(63, width / height, 1, 10000);
    this.camera.position.z = 30;
    this.camera.position.y = 2.6;
    this.camera.position.x = -1.6;

    const textureLoader = new THREE.TextureLoader();

    textureLoader.load('../assets/img/near-blurred.jpg', (texture) => {
      this.scene.background = texture;
    });

    textureLoader.load('../assets/texture/alpha-map.jpg', (alphaMap) => {
      alphaMap.flipY = false;
      textureLoader.load('../assets/texture/near-texture.png', (texture) => {
        texture.flipY = false;
        this.material = new THREE.MeshBasicMaterial({ map: texture, alphaMap: alphaMap, transparent: true });
      });
    });

    this.scene.add(this.group)
  }


  customPerformanceMeasurement(meter: SequenceLogger, renderObject: RenderObject): boolean {
    return false;
  }

  init(data: any): void { }

  renderFrame(renderObject: RenderObject): void {
    let landmarks = renderObject.data.landmarks;

    if (this.faces != null) this.scene.remove(this.faces);
    if (landmarks != null) this.addFaces(landmarks);
    this.renderer.render(this.scene, this.camera);
  }

  private addFaces(landmarks: any) {
    this.group.remove(this.faces);
    const targetFaceAlignment = new Matrix4().fromArray(TRANSFORMATION_PORTRAIT_IMAGE);

    let targetFaceTranslation = new THREE.Vector3(),
    targetFaceRotation = new THREE.Quaternion(),
    targetFaceScale = new THREE.Vector3();
    targetFaceAlignment.decompose(targetFaceTranslation, targetFaceRotation, targetFaceScale);

    let geometry = this.makeGeometry(landmarks);

    this.faces = new THREE.Mesh(geometry, this.material);
    this.faces.matrixAutoUpdate = true;
    this.faces.scale.set(0.63, 0.63, 1);
    this.faces.matrix.setPosition(targetFaceTranslation);
    this.group.scale.set(targetFaceScale.x, targetFaceScale.y, 1);

    this.group.add(this.faces);
  }


  private makeGeometry = (landmarks: Array<any>) => {
    let geometry = new BufferGeometry();
    let vertices = [];
    let uvs = [];

    let closeFactor = Helper.getDistance(landmarks[159], landmarks[145]) / Helper.getScale(landmarks[234], landmarks[454]);
    closeFactor = 1 - Math.max(0, Math.min(1, (closeFactor - 0.037) / 0.022));

    const landmarkPairs = [[246, 7], [161, 163], [160, 144], [159, 145], [158, 153], [157, 154], [173, 155], [398, 382], [384, 381], [385, 380], [386, 374], [387, 373], [388, 390], [466, 249]];

    for (let i = 0; i < landmarkPairs.length; i++) {
      const lA = landmarkPairs[i][0];
      const lB = landmarkPairs[i][1];
      const closeDist = Helper.getDistance(landmarks[lA], landmarks[lB]);
      landmarks[lA].y = landmarks[lA].y - closeFactor * closeDist;
    }

    for (let i = 0; i < landmarks.length; i++) {
      const coordinates = landmarks[i];
      let vertex = [coordinates.x, coordinates.y, coordinates.z];
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

  destruct(): void { }

}

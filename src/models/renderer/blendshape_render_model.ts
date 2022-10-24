import { SequenceLogger } from "../../logging/sequence_logger";
import { RenderObject } from "../../renderer/renderer";
import { RenderModel } from "../../renderer/render_model";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import {
  SkinnedMesh,
  WebGLRendererParameters
} from 'three';
import { Helper } from "../../etc/helper";
import { Feature, Normalizer, rotateCoordinate } from "../../etc/blendshape";
import { BLENDSHAPE_EYEBROW_UP, BLENDSHAPE_EYES_CLOSED, BLENDSHAPE_MOUTH_OPEN, BLENDSHAPE_MOUTH_SMILE, BLENDSHAPE_REF_FACE } from "../../etc/face_geom";

export class BlendshapeRendermodel implements RenderModel {
  domRenderer: HTMLCanvasElement = document.createElement('canvas');
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private group: THREE.Object3D;
  private character: THREE.Group;
  private rotation_o: THREE.Quaternion;
  private scale_o: any;
  private mesh: THREE.Mesh;
  private mouthFeature: Feature;
  private eyesFeature: Feature;
  private eyeBrowFeature: Feature;

  private loadModel(file: string): Promise<[THREE.Group, THREE.Mesh]> {
    return new Promise((res, rej) => {
      const loader = new GLTFLoader();
      loader.load(file, function (gltf) {
        var obj: THREE.SkinnedMesh;
        gltf.scene.traverse(function (child) {
          if (child.type == 'SkinnedMesh') {
            const child1 = child as THREE.Mesh;
            child1.castShadow = true;
            child1.receiveShadow = true;
            child1.geometry.computeVertexNormals();
            obj = child1 as SkinnedMesh;
          }
        });
        res([gltf.scene, obj]);
      });
    });
  }

  private async loadCharacter() {
    [this.character, this.mesh] = await this.loadModel('../assets/models/character-rigged.gltf');
    const size = new THREE.Box3().setFromObject(this.character).getSize(new THREE.Vector3());
    this.character.name = 'character';
    this.character.scale.set(1 / size.x, 1 / size.x, 1 / size.x);
    this.character.scale.set(2000, 2000, 2000);
    this.character.position.set(0, -1300, 0);
  }

  constructor(width: number, height: number) {
    let encodedLandmarkIndices = [78, 308, 13, 14, 2, 200, 214, 432, 145, 160, 22, 66, 104, 55];
    this.mouthFeature = new Feature([0, 1, 2, 3], [4, 5, 6, 7], encodedLandmarkIndices.map(i => BLENDSHAPE_REF_FACE[i]));
    this.eyesFeature = new Feature([8], [9, 10], encodedLandmarkIndices.map(i => BLENDSHAPE_REF_FACE[i]));
    this.eyeBrowFeature = new Feature([11], [12, 13], encodedLandmarkIndices.map(i => BLENDSHAPE_REF_FACE[i]));

    this.mouthFeature.addBlendshape(BLENDSHAPE_MOUTH_OPEN);
    this.mouthFeature.addBlendshape(BLENDSHAPE_MOUTH_SMILE);
    this.eyesFeature.addBlendshape(BLENDSHAPE_EYES_CLOSED);
    this.eyeBrowFeature.addBlendshape(BLENDSHAPE_EYEBROW_UP);

    this.loadCharacter();
    this.group = new THREE.Object3D();

    this.domRenderer.width = width;
    this.domRenderer.height = height;
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.domRenderer,
      antialias: true,
      devicePixelRation: window.devicePixelRatio || 1
    } as WebGLRendererParameters);

    this.renderer.setClearColor(0xffffff);
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    const loader = new THREE.TextureLoader();
    loader.load('../assets/img/near-background.jpg', (texture) => {
      this.scene.background = texture;
    });

    this.camera = new THREE.PerspectiveCamera(45, 1920 / 1080, 1, 1000);
    this.camera.position.z = 200;

    this.renderer.setPixelRatio(window.devicePixelRatio );
    this.renderer.setSize(width, height);

    const light = new THREE.HemisphereLight(0xffeeb1, 0x080820, 2);
    this.scene.add(light);
    this.scene.add(this.group);
  }

  customPerformanceMeasurement(meter: SequenceLogger, renderObject: RenderObject): boolean {
    return false;
  }

  init(data: any): void { }

  renderFrame(renderObject: RenderObject): void {
    const featureLandmarksIn = renderObject.data.features;
    const featureLandmarks = [];
    for (let i = 0; i < 14; i++) {
      featureLandmarks.push([featureLandmarksIn[i].x, featureLandmarksIn[i].y]);
    }

    const alignLandmarks = Helper.scaleLandmarks(renderObject.data.align, 320, 180)
    if (alignLandmarks != null) {
      this.group.clear();
      this.alignModel(alignLandmarks);
      this.animate(featureLandmarks);
      this.group.add(this.character);
    }

    this.renderer.render(this.scene, this.camera);
  }

  private animate(landmarks: any) {

    this.mouthFeature.update(landmarks);
    this.eyeBrowFeature.update(landmarks);
    this.eyesFeature.update(landmarks);

    this.mesh.morphTargetInfluences[this.mesh.morphTargetDictionary['jawOpen']] = this.mouthFeature.blendshapes[0].getValue();
    this.mesh.morphTargetInfluences[this.mesh.morphTargetDictionary['mouthSmile']] = this.mouthFeature.blendshapes[1].getValue();
    this.mesh.morphTargetInfluences[this.mesh.morphTargetDictionary['eyesClosed']] = this.eyesFeature.blendshapes[0].getValue();
    this.mesh.morphTargetInfluences[this.mesh.morphTargetDictionary['browOuterUpLeft']] = this.eyesFeature.blendshapes[0].getValue();
    this.mesh.morphTargetInfluences[this.mesh.morphTargetDictionary['browOuterUpRight']] = this.eyesFeature.blendshapes[0].getValue();
    this.mesh.morphTargetInfluences[this.mesh.morphTargetDictionary['browInnerUp']] = this.eyeBrowFeature.blendshapes[0].getValue();
  }

  private getLowPassQuaternion(last: THREE.Quaternion, current: THREE.Quaternion, threshold: number): THREE.Quaternion {
    if (last == null)
      return current;

    current.w = threshold * last.w + (1 - threshold) * current.w;
    current.x = threshold * last.x + (1 - threshold) * current.x;
    current.y = threshold * last.y + (1 - threshold) * current.y;
    current.z = threshold * last.z + (1 - threshold) * current.z;

    return current;
  }

  private getLowPassVector(last: THREE.Vector3, current: THREE.Vector3, threshold: number): THREE.Vector3 {
    if (last == null)
      return current;

    current.x = threshold * last.x + (1 - threshold) * current.x;
    current.y = threshold * last.y + (1 - threshold) * current.y;
    current.z = threshold * last.z + (1 - threshold) * current.z;

    return current;
  }

  private alignModel(landmarks: any) {
    //normalize
    this.group.rotation.x = 0;
    this.group.rotation.y = 0;
    this.group.rotation.z = 0;

    //rotation
    const rotation = this.getLowPassQuaternion(this.rotation_o, Helper.getRotation(landmarks[0], landmarks[1], landmarks[2], landmarks[3], landmarks[4]), 0.5);
    this.rotation_o = rotation;
    this.group.applyQuaternion(rotation);

    //scale
    const scale = Helper.getScale(landmarks[3], landmarks[4]);
    this.group.scale.copy(this.getLowPassVector(new THREE.Vector3().addScalar(this.scale_o), new THREE.Vector3().addScalar(scale), 0.5));

    this.scale_o = scale;

    //translate
    const translation = Helper.getTranslation(landmarks[0]);
    this.group.position.copy(translation);
  }

  destruct(): void { }

}
import {FaceMesh, FACEMESH_TESSELATION, InputImage, NormalizedLandmarkList, Results} from '@mediapipe/face_mesh'
import {drawConnectors} from '@mediapipe/drawing_utils'

export class FeatureExtraction{
    private readonly LIBRARY_FACE_MESH : string =  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';
    private readonly faceMesh;

    constructor(){
        this.faceMesh = new FaceMesh({locateFile: (file) => {
          return this.LIBRARY_FACE_MESH + file;
        }});
        this.startFaceDetection();
    }

    private async startFaceDetection(){
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.faceMesh.onResults(this.onResult.bind(this));
      this.faceMesh.initialize();
    }

    public onFaceLandmarks(landmarks : NormalizedLandmarkList[]){};

    private onResult(results : Results){
      if (results.multiFaceLandmarks)
      this.onFaceLandmarks(results.multiFaceLandmarks);
  }

    public async getFeatures(image : InputImage){
      await this.faceMesh.send({image: image});
    }    

}
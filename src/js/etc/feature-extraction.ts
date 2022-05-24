import {FaceMesh, FACEMESH_TESSELATION, InputImage, Results} from '@mediapipe/face_mesh'
import {drawConnectors} from '@mediapipe/drawing_utils'

export class FeatureExtraction{
    private readonly LIBRARY_FACE_MESH : string =  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';
    private readonly canvasElement : HTMLCanvasElement = <HTMLCanvasElement>document.getElementsByClassName('output_canvas')[0];
    private readonly canvasCtx = this.canvasElement.getContext('2d');
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

    private onResult(results : Results){
      this.canvasCtx.save();
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
     
      if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
          drawConnectors(this.canvasCtx, landmarks, FACEMESH_TESSELATION,
                         {color: '#C0C0C070', lineWidth: 1});
        }
      }
      this.canvasCtx.restore();
  }

    public async getFeatures(image : InputImage){
      await this.faceMesh.send({image: image});
    }    

}
import {FaceMesh, FACEMESH_RIGHT_EYE, FACEMESH_RIGHT_EYEBROW, FACEMESH_RIGHT_IRIS, FACEMESH_LEFT_EYEBROW, FACEMESH_LEFT_EYE, FACEMESH_FACE_OVAL, FACEMESH_LEFT_IRIS, FACEMESH_LIPS, FACEMESH_TESSELATION} from '@mediapipe/face_mesh'
import {drawConnectors} from '@mediapipe/drawing_utils'

export class FeatureExtraction{

    readonly LIBRARY_FACE_MESH : string =  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';
    readonly videoElement : HTMLVideoElement = <HTMLVideoElement>document.getElementsByClassName('video')[0];
    readonly canvasElement : HTMLCanvasElement = <HTMLCanvasElement>document.getElementsByClassName('output_canvas')[0];
    readonly canvasCtx = this.canvasElement.getContext('2d');
    readonly faceMesh;

    constructor(){
        
        this.faceMesh = new FaceMesh({locateFile: (file) => {
          return this.LIBRARY_FACE_MESH + file;
        }});
        this.startFaceDetection();
    }

    public async getFeatures(frame : any){
      await this.faceMesh.send({image: frame});
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

    private onResult(results : any){

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
}
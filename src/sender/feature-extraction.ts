import {FaceMesh, FACEMESH_RIGHT_EYE, FACEMESH_RIGHT_EYEBROW, FACEMESH_RIGHT_IRIS, FACEMESH_LEFT_EYEBROW, FACEMESH_LEFT_EYE, FACEMESH_FACE_OVAL, FACEMESH_LEFT_IRIS, FACEMESH_LIPS, FACEMESH_TESSELATION} from '@mediapipe/face_mesh'
import {drawConnectors} from '@mediapipe/drawing_utils'

export class FeatureExtraction{

    readonly videoElement : HTMLVideoElement = <HTMLVideoElement>document.getElementsByClassName('video')[0];
    readonly canvasElement : HTMLCanvasElement = <HTMLCanvasElement>document.getElementsByClassName('output_canvas')[0];
    readonly canvasCtx = this.canvasElement.getContext('2d');
    readonly faceMesh;

    constructor(){
        this.faceMesh = new FaceMesh();

        console.log(this.canvasCtx);

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });

          this.faceMesh.onResults(this.onResult);

          this.faceMesh.send({image: this.videoElement});
    }

    private onResult(results : any){
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        this.canvasCtx.drawImage(
            results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
        if (results.multiFaceLandmarks) {
          for (const landmarks of results.multiFaceLandmarks) {
            drawConnectors(this.canvasCtx, landmarks, FACEMESH_TESSELATION,
                           {color: '#C0C0C070', lineWidth: 1});
            drawConnectors(this.canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {color: '#FF3030'});
            drawConnectors(this.canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW, {color: '#FF3030'});
            drawConnectors(this.canvasCtx, landmarks, FACEMESH_RIGHT_IRIS, {color: '#FF3030'});
            drawConnectors(this.canvasCtx, landmarks, FACEMESH_LEFT_EYE, {color: '#30FF30'});
            drawConnectors(this.canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW, {color: '#30FF30'});
            drawConnectors(this.canvasCtx, landmarks, FACEMESH_LEFT_IRIS, {color: '#30FF30'});
            drawConnectors(this.canvasCtx, landmarks, FACEMESH_FACE_OVAL, {color: '#E0E0E0'});
            drawConnectors(this.canvasCtx, landmarks, FACEMESH_LIPS, {color: '#E0E0E0'});
          }
        }
        this.canvasCtx.restore();
    }
}
import {FaceMesh, FACEMESH_TESSELATION, InputImage, NormalizedLandmarkList, Results} from '@mediapipe/face_mesh'
import {drawConnectors} from '@mediapipe/drawing_utils'
import { PerformanceMeter } from '../etc/performance';
import { VideoStream } from './renderer';

export class Encoder{
    private readonly LIBRARY_FACE_MESH =  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';
    private readonly faceMesh;
    private readonly stream;
    private readonly tasks : Map<number, Encoder.Encoding>
    private readonly fps = 30;
    private currentLandMarks : NormalizedLandmarkList[];
    private renderDom : HTMLVideoElement;

    constructor(){
        this.faceMesh = new FaceMesh({locateFile: (file) => {
          return this.LIBRARY_FACE_MESH + file;
        }});
        this.startFaceDetection();
        this.stream = new VideoStream();
        this.tasks = new Map();
        
    }

    async getStream(){
      if(this.stream.getStream() == null){
        await this.stream.startWebcam(480,360);
        this.renderDom = document.createElement('video');
        this.renderDom.onloadeddata = ()=>{
          window.setInterval(()=>{this.update()}, 1000/this.fps);
        };
        this.renderDom.srcObject = this.stream.getStream();
        this.renderDom.hidden = true;
        this.renderDom.autoplay = true;
       
        document.body.append(this.renderDom);
      }
      return this.stream.getStream();
    }

    start(peerId : number, encoding : Encoder.Encoding){
      this.tasks.set(peerId, encoding);
    }

    stop(peerId : number){
      this.tasks.delete(peerId);
    }

    encodeWireframe(){
      return "x";
    }

    update(){

      this.getFeatures(this.renderDom);
        this.tasks.forEach((task, peerID)=>{
          switch(task){
            case Encoder.Encoding.Wireframe:
              if(this.currentLandMarks != null)
                this.onFrameAvailable(peerID, this.currentLandMarks[0]);
              console.log("feature send");
            break;

            default:
          }
        });
    }

    onFrameAvailable(peerId : number, data : any){}

    private async startFaceDetection(){
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.faceMesh.onResults((results) => {
        //console.log(results);
        if (results.multiFaceLandmarks && results.multiFaceLandmarks [0] != null)
          this.currentLandMarks = results.multiFaceLandmarks;
      });

      this.faceMesh.initialize();
    }

    public getPerformanceSample() : PerformanceMeter.Sample{
      return  new PerformanceMeter.Sample(null, null);
    }

    async getFeatures(image : InputImage){
      await this.faceMesh.send({image: image});
    }    

}

export namespace Encoder{
  export class Task{
    readonly peerId : number;
    readonly encoding : Encoding

    constructor(peerId : number, encoding : Encoding){
      this.peerId = peerId;
      this.encoding = encoding;
    }
  }



  export enum Encoding{
    Wireframe
  }
}
import { drawConnectors } from "@mediapipe/drawing_utils";
import { FACEMESH_FACE_OVAL, FACEMESH_LEFT_EYE, FACEMESH_LEFT_EYEBROW, FACEMESH_LEFT_IRIS, FACEMESH_LIPS, FACEMESH_RIGHT_EYE, FACEMESH_RIGHT_EYEBROW, FACEMESH_RIGHT_IRIS, FACEMESH_TESSELATION } from "@mediapipe/face_mesh";
import { PerformanceMeter } from "../etc/performance";
import { RenderMode } from "./render_types";

const S_TO_MS = 1000;

export class Renderer{

    private readonly domElement : HTMLElement;
    private domRenderer : HTMLElement;
    private mode : RenderMode;
    private readonly width = 480;
    private readonly height = 360;
    private performanceMeter : PerformanceMeter;
    private logInterval : number;

    constructor(domElement: HTMLElement){
        this.domElement = domElement;
        this.performanceMeter = new PerformanceMeter();
    }

    getMode(){
        return this.mode;
    }

    setMode(mode : RenderMode){
        this.clear();
        this.mode = mode;
        this.domRenderer = document.createElement('div');
        
        switch(mode){
            case RenderMode.Video:
                this.domRenderer = this.getVideoRenderer();
                break;
            case RenderMode.FaceLandmarks:
                this.domRenderer = this.getCanvasRenderer();
                break;
            default:
        }

        this.domElement.appendChild(this.domRenderer);
    }
    
    private getCanvasRenderer() : HTMLElement{
        const canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.width = this.width;
        canvas.height = this.height;
        return canvas;
    }

    private getVideoRenderer() : HTMLElement{
        const video = document.createElement('video') as HTMLVideoElement;
        video.width = this.width;
        video.height = this.height;
        video.autoplay = true;
        video.playsInline = true;
        return video;
    }

    public getPerformanceSample() : PerformanceMeter.Sample{       
        return this.performanceMeter.sample();
    }

    clear(){
        //this.performanceMeter.sample();

        if(this.domRenderer == null)
        return;
        
        switch(this.mode){
            case RenderMode.Video:
                this.clearVideo();
                break;

            default:
        }

        this.domElement.childNodes.forEach(node =>{
            this.domElement.removeChild(node);
        }) 
        this.domRenderer = null;

    }

    private clearVideo(){
        window.clearInterval(this.logInterval);
        let video = this.domRenderer as HTMLVideoElement;
        video.pause();
        video.removeAttribute('src');
        window.setTimeout(() => {
            video.load();
        }, (50));
        
    }

    private isValidInput(renderObject : RenderObject){
        if(renderObject.mode == RenderMode.Video && this.mode == RenderMode.Video) return true;
        if(renderObject.mode == RenderMode.FaceLandmarks && this.mode == RenderMode.FaceLandmarks) return true;
        return false;
    }
    
    private renderVideo(renderObject : RenderObject){
        let video = this.domRenderer as HTMLVideoElement;
        video.srcObject = renderObject.data.stream;

        this.logInterval = window.setInterval(()=>{
            if(!renderObject.rtcStats) return;

            renderObject.data.peer.getStats().then((stats : any)=>{
                let decodeStat = stats.get(renderObject.data.statsKey);
                console.log(decodeStat);
                this.performanceMeter.addContinious('decoding', decodeStat.totalDecodeTime * S_TO_MS, decodeStat.framesDecoded);
            });
        }, 1000);
    }

    private renderWireframe(renderObject : RenderObject){
        let canvas = this.domRenderer as HTMLCanvasElement;
        let context = canvas.getContext('2d');
        context.save();
        context.clearRect(0,0, this.width, this.height);
       
        let landmarks = renderObject.data.data;
        drawConnectors(context, landmarks, FACEMESH_TESSELATION,{color: '#C0C0C070', lineWidth: 1});
        drawConnectors(context, landmarks, FACEMESH_RIGHT_EYE, {color: '#C0C0C070'});
        drawConnectors(context, landmarks, FACEMESH_RIGHT_EYEBROW, {color: '#C0C0C070'});
        drawConnectors(context, landmarks, FACEMESH_RIGHT_IRIS, {color: '#C0C0C070'});
        drawConnectors(context, landmarks, FACEMESH_LEFT_EYE, {color: '#C0C0C070'});
        drawConnectors(context, landmarks, FACEMESH_LEFT_EYEBROW, {color: '#C0C0C070'});
        drawConnectors(context, landmarks, FACEMESH_LEFT_IRIS, {color: '#C0C0C070'});
        drawConnectors(context, landmarks, FACEMESH_FACE_OVAL, {color: '#C0C0C070'});
        drawConnectors(context, landmarks, FACEMESH_LIPS, {color: '#C0C0C070'});
        context.restore();
    }


    render(data : RenderObject){
        if(!this.isValidInput(data)) throw("invalid render data");

        switch(data.mode){
            case RenderMode.Video:
                this.renderVideo(data);
            break;
            case RenderMode.FaceLandmarks:
                this.performanceMeter.measure('decoding');
                this.renderWireframe(data);
                this.performanceMeter.stopMeasuring('decoding');
            break;
            default:
        }
    }


    
}

export class RenderObject{
    readonly mode : RenderMode;
    rtcStats = false;
    readonly data : any;

    constructor(mode : RenderMode, data : any, rtcStats? : boolean){
        this.mode = mode;
        this.data = data;
        this.rtcStats = rtcStats?rtcStats:false;
    }

}





export class VideoStream{
    private stream : MediaStream;

    constructor(){
        window.requestAnimationFrame(()=>{this.frameChanged});
    }

    private frameChanged(){
        this.onFrameChanged();
        window.requestAnimationFrame(()=>{this.frameChanged});
    }

    onFrameChanged(){};

    getStream() : MediaStream{
        return this.stream;
    }

    async startWebcam(width : number, height : number) : Promise<void>{
        let videoConstraints = {  mandatory: {
            maxHeight: height,
            maxWidth: width 
          }};
          
        return new Promise((resolve, reject)=>{
            if(navigator.mediaDevices.getUserMedia){
                navigator.mediaDevices.getUserMedia({video : videoConstraints as MediaTrackConstraints}).then(
                    (stream)=>{
                        this.stream = stream;
                        resolve();
                        return;
                        
                    })["catch"]((error)=>{
                        reject();
                        return;
                    });
            }
        })
    }
}
import { PerformanceMeter } from "../etc/performance";

export class Renderer{

    private readonly domElement : HTMLElement;
    private domRenderer : HTMLElement;
    private mode : Renderer.Mode;
    private readonly width = 480;
    private readonly height = 360;
    private performanceMeter : PerformanceMeter;
    private logInterval : number;

    constructor(domElement: HTMLElement){
        this.domElement = domElement;
        this.performanceMeter = new PerformanceMeter();
    }

    setMode(mode : Renderer.Mode){
        this.clear();
        this.mode = mode;
        
        switch(mode){
            case Renderer.Mode.Video:
                this.domRenderer = this.getVideoRenderer();
                break;
            default:
        }

        this.domElement.appendChild(this.domRenderer);
    }

    private getVideoRenderer(){
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
        if(this.domRenderer == null)
        return;
        
        switch(this.mode){
            case Renderer.Mode.Video:
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
        if(renderObject.type == RenderObject.Type.RtcVideo && this.mode == Renderer.Mode.Video) return true;
        if(renderObject.type == RenderObject.Type.Video && this.mode == Renderer.Mode.Video) return true;
        if(renderObject.type == RenderObject.Type.FaceLandmarks && this.mode == Renderer.Mode.FaceLandmarks) return true;
        return false;
    }
    
    private renderVideo(renderObject : RenderObject){
        let video : HTMLVideoElement = this.domRenderer as HTMLVideoElement;
        video.srcObject = renderObject.data.stream;

        this.logInterval = window.setInterval(()=>{
            if(renderObject.type != RenderObject.Type.RtcVideo) return;

            renderObject.data.peer.getStats().then((stats : any)=>{
                let decodeStat = stats.get(renderObject.data.statsKey);
                this.performanceMeter.addContinious('decoding', decodeStat.totalDecodeTime, decodeStat.framesDecoded);
            });
        }, 1000);
    }


    render(data : RenderObject){
        if(!this.isValidInput(data)) throw("invalid render data");

        switch(data.type){
            case RenderObject.Type.Video:
                this.renderVideo(data);
            break;

            case RenderObject.Type.RtcVideo:
                this.renderVideo(data);
            case RenderObject.Type.FaceLandmarks:
                
            break;
            default:
        }
    }


    
}

export class RenderObject{
    readonly type : RenderObject.Type;
    readonly data : any;

    constructor(type : RenderObject.Type, data : any){
        this.type = type;
        this.data = data;
    }

}

export namespace RenderObject{
    export enum Type{
        Video,
        RtcVideo,
        FaceLandmarks
    }
}


export namespace Renderer{

   
    export enum Mode{
        Video,
        FaceLandmarks
    }
}

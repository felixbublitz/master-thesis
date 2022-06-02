import { Stats, StatSet, StatTuple } from "../etc/stats";

export class Renderer{

    private readonly domElement : HTMLElement;
    private domRenderer : HTMLElement;
    private mode : Renderer.Mode;
    private readonly width = 480;
    private readonly height = 360;
    private lastRenderObject  : RenderObject;
    private lastRenderStat  : StatTuple;

    constructor(domElement: HTMLElement){
        this.domElement = domElement;
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

    public async getStats() : Promise<StatSet>{

        return new Promise(async (resolve, reject)=>{
            if(this.lastRenderObject == null){
                reject("no render stats available");
                return;
            }
            switch(this.lastRenderObject.type){
                case RenderObject.Type.RtcVideo:
                    this.lastRenderObject.data.peer.getStats().then((stats : any)=>{
                        let decodeStat = stats.get(this.lastRenderObject.data.statsKey);
                        let out = new StatSet();
                        
                        if(this.lastRenderStat == null) out.add('decodingTime', new StatTuple(decodeStat.totalDecodeTime, decodeStat.framesDecoded))
                        else out.add('decodingTime', new StatTuple(decodeStat.totalDecodeTime - this.lastRenderStat.elapsedTime, decodeStat.framesDecoded - this.lastRenderStat.frames))
                       
                        this.lastRenderStat = new StatTuple(decodeStat.totalDecodeTime, decodeStat.framesDecoded);
                        resolve(out);
                    });
                    
                    break;
                default:
                    reject("no render stats available");
            }
        });

       
       
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
    }


    render(data : RenderObject){
        if(!this.isValidInput(data)) throw("invalid render data");

        this.lastRenderObject = data;

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

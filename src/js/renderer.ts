export class Renderer{

    private readonly domElement : HTMLElement;
    private domRenderer : HTMLElement;
    private mode : Renderer.Mode;
    private readonly width = 480;
    private readonly height = 360;

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

    private isValidInput(data : RenderData){
        if(data.type == RenderData.Type.Video && this.mode == Renderer.Mode.Video) return true;
        if(data.type == RenderData.Type.FaceLandmarks && this.mode == Renderer.Mode.FaceLandmarks) return true;
        return false;
    }
    
    private renderVideo(data : RenderData){
        let video : HTMLVideoElement = this.domRenderer as HTMLVideoElement;
        video.srcObject = data.data;
    }


    render(data : RenderData){
        if(!this.isValidInput(data)) throw("invalid render data");

        switch(data.type){
            case RenderData.Type.Video:
                this.renderVideo(data);
            break;
            case RenderData.Type.FaceLandmarks:
                
            break;
            default:
        }
    }


    
}

export class RenderData{
    readonly type : RenderData.Type;
    readonly data : any;

    constructor(type : RenderData.Type, data : any){
        this.type = type;
        this.data = data;
    }

}

export namespace RenderData{
    export enum Type{
        Video,
        FaceLandmarks
    }
}


export namespace Renderer{

   
    export enum Mode{
        Video,
        FaceLandmarks
    }
}

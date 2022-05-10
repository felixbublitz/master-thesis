export class VideoHandler{
    readonly domElement : HTMLVideoElement;

    constructor(domIdentifier: string){
        this.domElement = <HTMLVideoElement>document.getElementById(domIdentifier);
        this.domElement.onloadeddata = this.loaded.bind(this);
    }


    public onFrameChanged(video : HTMLVideoElement){};


    private loaded(this: any, ev : Event){
        window.requestAnimationFrame(this.frameChanged.bind(this));
    }

    private frameChanged(){
        this.onFrameChanged(this.domElement);
        window.requestAnimationFrame(this.frameChanged.bind(this));
    }

    public start(){
        if(navigator.mediaDevices.getUserMedia){
            navigator.mediaDevices.getUserMedia({video : true}).then(
                (stream)=>{
                    this.domElement.srcObject = stream;
                    
                })["catch"]((error)=>{
                    console.log("error");
                });
        }
    }


}
export class VideoHandler{
    readonly domElement : HTMLVideoElement;

    constructor(domIdentifier: string){
        this.domElement = <HTMLVideoElement>document.getElementById(domIdentifier);
    }


    public onFrameChanged(video : HTMLVideoElement){};


    private frameChanged(){
        this.onFrameChanged(this.domElement);
        window.requestAnimationFrame(this.frameChanged.bind(this));
    }

    public start(){
        if(navigator.mediaDevices.getUserMedia){
            navigator.mediaDevices.getUserMedia({video : true}).then(
                (stream)=>{
                    this.domElement.srcObject = stream;
                    window.requestAnimationFrame(this.frameChanged.bind(this));
                })["catch"]((error)=>{
                    console.log("error");
                });
        }
    }


}
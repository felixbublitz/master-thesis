export class VideoHandler{
    readonly domElement : HTMLVideoElement;

    constructor(domIdentifier: string){
        this.domElement = <HTMLVideoElement>document.getElementById(domIdentifier);
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
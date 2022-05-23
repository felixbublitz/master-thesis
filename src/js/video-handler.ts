export class VideoHandler{
    readonly domElement : HTMLVideoElement;
    private stream : MediaStream;

    constructor(domIdentifier: string){
        this.domElement = <HTMLVideoElement>document.getElementById(domIdentifier);
        this.domElement.onloadeddata = this.loaded.bind(this);
    }


    public onFrameChanged(video : HTMLVideoElement){};

    public getStream() : MediaStream{
        return this.stream;
    }

    private loaded(this: any, ev : Event){
        window.requestAnimationFrame(this.frameChanged.bind(this));
    }

    private frameChanged(){
        this.onFrameChanged(this.domElement);
        window.requestAnimationFrame(this.frameChanged.bind(this));
    }

    public startStream(streams : readonly MediaStream[]){
        const [stream] = streams;
        this.domElement.srcObject = stream;
    }

    public async startWebcam() : Promise<void>{

        return new Promise((resolve, reject)=>{
            if(navigator.mediaDevices.getUserMedia){
                navigator.mediaDevices.getUserMedia({video : true}).then(
                    (stream)=>{
                        this.stream = stream;
                        this.domElement.srcObject = stream;
                        resolve();
                        
                    })["catch"]((error)=>{
                        reject();
                    });
            }
        })

        
    }


}
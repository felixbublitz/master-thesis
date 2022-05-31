export class VideoHandler{
    private readonly domElement : HTMLVideoElement;
    private stream : MediaStream;

    constructor(domIdentifier: string){
        this.domElement = document.getElementById(domIdentifier) as HTMLVideoElement;
        this.domElement.onloadeddata = () => {this.loaded};
    }

    private loaded(this: VideoHandler, ev : Event){
        window.requestAnimationFrame(()=>{this.frameChanged});
    }

    private frameChanged(){
        this.onFrameChanged(this.domElement);
        window.requestAnimationFrame(()=>{this.frameChanged});
    }

    onFrameChanged(video : HTMLVideoElement){};

    getStream() : MediaStream{
        return this.stream;
    }

    stopStreams(){
        this.domElement.pause();
        this.domElement.removeAttribute('src');
        window.setTimeout(() => {
            this.domElement.load();
        }, (50));
        
    }

    startStreams(streams : readonly MediaStream[]){
        const [stream] = streams;
        this.domElement.srcObject = stream;
    }

    async startWebcam() : Promise<void>{
        return new Promise((resolve, reject)=>{
            if(navigator.mediaDevices.getUserMedia){
                navigator.mediaDevices.getUserMedia({video : true}).then(
                    (stream)=>{
                        this.stream = stream;
                        this.domElement.srcObject = stream;
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
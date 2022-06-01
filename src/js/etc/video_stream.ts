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

    async startWebcam() : Promise<void>{
        return new Promise((resolve, reject)=>{
            if(navigator.mediaDevices.getUserMedia){
                navigator.mediaDevices.getUserMedia({video : true}).then(
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
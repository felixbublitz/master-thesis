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
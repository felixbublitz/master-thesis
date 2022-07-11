import { Codec } from './codecs/codec';
import { PerformanceMeter } from '../measuring/performance';

export class Encoder{
    private readonly tasks : Map<number, Codec>
    private readonly fps = 30;
    private videoDom : HTMLVideoElement;
    private readonly stream : VideoStream ;
    private readonly performanceMeter : PerformanceMeter;
    onFrameAvailable(peerId : number, data : Int8Array){};  

    constructor(){
        this.tasks = new Map();
        this.stream = new VideoStream();
        this.performanceMeter = new PerformanceMeter();
    }

    async getStream(){
      if(this.stream.getStream() == null){
        await this.stream.startWebcam(480,360);
        this.videoDom = document.createElement('video');
        this.videoDom.onloadeddata = ()=>{
          window.setInterval(()=>{this.update()}, 1000/this.fps);
        };
        this.videoDom.srcObject = this.stream.getStream();
        this.videoDom.hidden = true;
        this.videoDom.autoplay = true;
       
        document.body.append(this.videoDom);
      }
      return this.stream.getStream();
    }

    start(peerId : number, codec : Codec){
      if(codec != null) codec.startEncoding();
      this.tasks.set(peerId, codec);
    }

    stop(peerId : number){
      this.tasks.delete(peerId);
    }

    update(){
      this.tasks.forEach((codec, peerID)=>{
        this.performanceMeter.measure('encoding');
        let encoded = codec.encodeFrame(this.videoDom);
        this.performanceMeter.stopMeasuring('encoding');

        if(encoded != null) this.onFrameAvailable(peerID, encoded);
      });
    }

    public async getPerformanceSample() : Promise<PerformanceMeter.Sample>{
      return this.performanceMeter.sample();
    }

 
}



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
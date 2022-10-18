import config from '../config';
import { SequenceLogger, TimeMeasuringItem } from '../logging/sequence_logger';
import { Codec } from './codec';

export class Encoder{
    private readonly encodingTasks : Map<number, Codec>
    private readonly decodingTasks : Map<number, boolean>;

    private readonly maxFPS = 200;
    private videoDom : HTMLVideoElement;
    private readonly stream : VideoStream ;
    private readonly sequenceLogger : SequenceLogger;
    private videoUrl : string;
    onFrameAvailable(peerId : number, data : Int8Array){};  

    constructor(videoUrl? : string){
        this.decodingTasks = new Map();
        this.encodingTasks = new Map();
        this.stream = new VideoStream();
        this.videoUrl = videoUrl;
        this.sequenceLogger = new SequenceLogger();
    }



    async getStream(){
      if(this.stream.getStream() == null){
        if(this.videoUrl) await this.stream.startVideo(this.videoUrl);
        else await this.stream.startWebcam(1280,720);

        this.videoDom = document.createElement('video');
        this.videoDom.onloadeddata = ()=>{
          window.setInterval(()=>{this.update()}, 1000/this.maxFPS);
        };
        this.videoDom.srcObject = this.stream.getStream();
        this.videoDom.style.display = "none";
        this.videoDom.autoplay = true;
       
        document.body.append(this.videoDom);
      }
      return this.stream.getStream();
    }

    start(peerId : number, codec : Codec){
      if(codec == null)return;
      codec.startEncoding();
      this.encodingTasks.set(peerId, codec);
    }

    stop(peerId : number){
      this.encodingTasks.delete(peerId);
      this.sequenceLogger.remove('encoding-' + peerId);
    }

    stopDecoding(peerId : number){
      this.decodingTasks.set(peerId, false);
      this.sequenceLogger.remove('decoding-' + peerId);
    }

    startDecoding(peerId : number){
      this.decodingTasks.set(peerId, true);
    }

    decode(codec : Codec, data : Int8Array, peerId : number){
      if(!this.decodingTasks.get(peerId)) return;
      let measureItem = this.sequenceLogger.get('decoding-' + peerId) as TimeMeasuringItem;
      if(measureItem == null){
        measureItem = new TimeMeasuringItem(2, 'ms');
        this.sequenceLogger.add("decoding-"+peerId, measureItem);
      }
      measureItem.measure();
      const out = codec.decodeFrame(data);
      measureItem.stopMeasuring();
      return out;
    }

    update(){
      this.encodingTasks.forEach(async (codec, peerId)=>{
        let measureItem = this.sequenceLogger.get('encoding-' + peerId) as TimeMeasuringItem;

        if(measureItem == null){
          measureItem = new TimeMeasuringItem(2, 'ms');
          this.sequenceLogger.add("encoding-"+peerId, measureItem);
        }

        measureItem.measure();
        let encoded = await codec.encodeFrame(this.videoDom);
        measureItem.stopMeasuring();

        if(encoded != null) this.onFrameAvailable(peerId, encoded);
      });
    }

    public async getPerformanceSample() : Promise<SequenceLogger.Sample>{
      return this.sequenceLogger.sample();
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

  async startVideo(videoUrl : string) : Promise<void>{
    const video = document.createElement('video');
    
    return new Promise((resolve)=>{
      video.onloadeddata = ()=>{
        video.play();
        (document as any).video = video;
        this.stream = (video as any).captureStream();
        resolve();
      }
      video.loop = true;
      video.src = videoUrl;
    });

    
  }

  async startWebcam(width : number, height : number) : Promise<void>{

      return new Promise((resolve, reject)=>{
          if(navigator.mediaDevices.getUserMedia){
              navigator.mediaDevices.getUserMedia(
              {
                video : {
                  deviceId: "80dd3b7591b50ed97d74fdb995e8003690aaa735fd72b524112891bd13739382",
                  width: config.VIDEO_WIDTH,
                  height: config.VIDEO_HEIGHT,
                  aspectRatio: config.VIDEO_WIDTH/ config.VIDEO_HEIGHT
                }
              }
                ).then(
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
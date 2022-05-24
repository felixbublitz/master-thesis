
import {ConnectionHandler} from "./ws/connection-handler";
import {VideoHandler} from "./etc/video-handler";
import {FeatureExtraction} from "./etc/feature-extraction";

class Sender{
    private readonly videoHandler;
    private readonly featureExtraction;
    private readonly connectionHandler;
    private readonly WS_ADDR = "ws://127.0.0.1:2222";
    private readonly VIDEO_DOM_ID = "video";
    
    constructor(){
        this.videoHandler = new VideoHandler(this.VIDEO_DOM_ID);
        this.featureExtraction = new FeatureExtraction();
        this.connectionHandler = new ConnectionHandler(); 
        this.init();       
    }

    private async init(){
        this.videoHandler.onFrameChanged = (video)=> {
            this.featureExtraction.getFeatures(video);
        };
        await this.videoHandler.startWebcam();

        this.connectionHandler.onConnection = ()=>{
            this.connectionHandler.sendVideo(this.videoHandler.getStream());
        };

        this.connectionHandler.init(this.WS_ADDR, parseInt(prompt('receiver id:')));
    }
}

new Sender();

import {ConnectionHandler} from "./connection-handler";

class Sender{
    readonly videoHandler;
    readonly featureExtraction;
    readonly connectionHandler;
    readonly SOCKET_ADDR = "ws://127.0.0.1:2222";
    
    constructor(){
        this.videoHandler = new VideoHandler("video");
        this.featureExtraction = new FeatureExtraction();
        this.connectionHandler = new ConnectionHandler(); 
        this.init();       
    }

    private async init(){
        this.videoHandler.onFrameChanged = (video)=> {
           
            this.featureExtraction.getFeatures(video);
        };

        await this.videoHandler.startWebcam();
        

        this.connectionHandler.onConnection = (handler)=>{
            let receiver = prompt('receiver id:');
            
            handler.sendVideo(this.videoHandler.getStream());
        };

        this.connectionHandler.init(this.SOCKET_ADDR);
    }
  
}

import {VideoHandler} from "./video-handler";
import {FeatureExtraction} from "./feature-extraction";



new Sender();


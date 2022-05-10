import {VideoHandler} from "./video-handler";
import {FeatureExtraction} from "./feature-extraction";

class Sender{
    readonly videoHandler;
    readonly featureExtraction;
    
    constructor(){
        this.videoHandler = new VideoHandler("video");
        this.featureExtraction = new FeatureExtraction();

        this.videoHandler.onFrameChanged = (video)=> {
           
            this.featureExtraction.getFeatures(video);
        }

        this.videoHandler.start();
        
    }
  
}

new Sender();
import {VideoHandler} from "../video-handler";
import {FeatureExtraction} from "./feature-extraction";

class Sender{
    readonly videoHandler;
    readonly featureExtraction = new FeatureExtraction();
    
    constructor(){
        this.videoHandler =new VideoHandler("video");
        this.videoHandler.start();
    }
  
}

new Sender();
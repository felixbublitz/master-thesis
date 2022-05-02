import {VideoHandler} from "../video-handler";

class Sender{
    readonly videoHandler = new VideoHandler("video");
    
    constructor(){
        this.videoHandler.start();
    }
  
}

new Sender();
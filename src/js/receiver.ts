import {VideoHandler} from "./etc/video-handler";
import {ConnectionHandler} from "./ws/connection-handler"

class Receiver{
    private readonly WS_ADDR = "ws://127.0.0.1:2222";
    private readonly videoHandler = new VideoHandler("video");
    private readonly connectionHandler = new ConnectionHandler();
   
    constructor(){
        this.connectionHandler.init(this.WS_ADDR, parseInt(prompt('sender id:')));
        this.connectionHandler.onStreamsReceived = this.onStreamsReceived.bind(this);
    }

    private onStreamsReceived(streams : readonly MediaStream[]){
        this.videoHandler.startStreams(streams);
    }
}

new Receiver();
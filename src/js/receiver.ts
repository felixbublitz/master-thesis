import {VideoHandler} from "./video-handler";
import {ConnectionHandler} from "./connection-handler"

class Receiver{
    readonly videoHandler = new VideoHandler("video");
    readonly connectionHandler = new ConnectionHandler();
    readonly SOCKET_ADDR = "ws://127.0.0.1:2222";
    readonly PEER_ID = 1;

    constructor(){
        
        this.connectionHandler.init(this.SOCKET_ADDR, this.PEER_ID);

        this.connectionHandler.onStreamsReceived = this.onStreamsReceived.bind(this);
    }


    private onStreamsReceived(streams : readonly MediaStream[]){
        console.log(streams);
        this.videoHandler.startStream(streams);
    }
  
}

new Receiver();
import {ConnectionHandler} from "./ws/connection-handler";
import {VideoHandler} from "./etc/video-handler";
import { DomElement } from "./ws/html-types";

class App{
    private readonly videoHandlers : Array<VideoHandler>;
    private readonly connectionHandler;
    private readonly wsAddr = "ws://127.0.0.1:2222";
    private readonly textPeer = "Peer";
    private readonly textMe = "[me]";
    private readonly videoWidth = 480;
    private readonly videoHeight = 320;
    
    constructor(){
        this.videoHandlers = new Array<VideoHandler>();
        this.connectionHandler = new ConnectionHandler(); 

        document.getElementById(DomElement.BT_INIT_CALL).onclick = (()=>{
            this.connectionHandler.call(parseInt(prompt('peer id:')));
        }).bind(this);

        document.getElementById(DomElement.SL_VIDEO_MODE).onchange = ((ev : Event)=>{
            this.connectionHandler.changeTransmissionMode(parseInt((<HTMLSelectElement>document.getElementById(DomElement.SL_VIDEO_MODE)).value));
        }).bind(this);

        this.init();       
    }

    private async init(){
        this.connectionHandler.onStreamsReceived = ((peerID : number, streams : readonly MediaStream[]) => {
            console.log("stream received");
            this.videoHandlers[peerID].startStreams(streams);
        }).bind(this);

        this.connectionHandler.onStreamStopped = ((peerID : number) => {
            console.log("stopp " + peerID);
            this.videoHandlers[peerID].stopStreams();
        }).bind(this);
        
        this.connectionHandler.onPeerConnected = ((peerID : number) => {
            this.addPeer(peerID);
        }).bind(this);

        this.connectionHandler.onPeerDisconnected = ((peerID : number) => {
            this.removePeer(peerID);
        }).bind(this);

        this.connectionHandler.requestWebcamStream = ()=>{
            return this.videoHandlers[this.connectionHandler.ownID].getStream();
        };

        this.connectionHandler.onIDReceived = (ownID) => {
            this.addPeer(ownID, true);
            this.videoHandlers[this.connectionHandler.ownID].startWebcam();
        };

        this.connectionHandler.init(this.wsAddr);
    }

    private addPeer(peerID : number, self? : boolean){
        let li = document.createElement("li");
        let video = document.createElement("video");
        let p = document.createElement("p");
        video.id = DomElement.PREFIX_PEER_VIDEO + peerID;
        video.width = this.videoWidth;
        video.height = this.videoHeight;
        video.autoplay = true;
        p.innerHTML = `${this.textPeer} ${peerID} ${self==true? this.textMe : ""}`;
        li.id = DomElement.PREFIX_PEER_ITEM + peerID;
        li.appendChild(video);
        li.appendChild(p);

        document.getElementById(DomElement.UL_PEER_ITEMS).appendChild(li);
        this.videoHandlers[peerID] = new VideoHandler(DomElement.PREFIX_PEER_VIDEO + peerID);
    }

    private removePeer(peerID : number, self? : boolean){
        document.getElementById(DomElement.PREFIX_PEER_ITEM + peerID).remove();
    }

}

let app = new App();
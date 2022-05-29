
import {ConnectionHandler} from "./ws/connection-handler";
import {VideoHandler} from "./etc/video-handler";
import {FeatureExtraction} from "./etc/feature-extraction";
import {NormalizedLandmarkList} from '@mediapipe/face_mesh';
import { CallMode } from "./ws/connection-types";


class Sender{

    private videoHandlers : Array<VideoHandler>;
    private readonly featureExtraction;
    private readonly connectionHandler;
    private readonly WS_ADDR = "ws://127.0.0.1:2222";
    private readonly BNT_INIT_CALL_ID= "btn-init-call";
    private readonly LBL_OWN_ID = "own-id";
    private readonly SLC_VIDEO_MODE = "video-mode";
    
    
    constructor(){
        this.videoHandlers = new Array<VideoHandler>();
        this.featureExtraction = new FeatureExtraction();
        this.connectionHandler = new ConnectionHandler(); 
        document.getElementById(this.BNT_INIT_CALL_ID).onclick = this.call.bind(this);
        document.getElementById(this.SLC_VIDEO_MODE).onchange = ((ev : Event)=>{
            this.connectionHandler.changeTransmissionMode(<CallMode>parseInt((<HTMLSelectElement>document.getElementById(this.SLC_VIDEO_MODE)).value));
        }).bind(this);
        this.init();       
    }

    public call(){
        this.connectionHandler.call(parseInt(prompt('peer id:')));
    }

    private async init(){

        this.featureExtraction.onFaceLandmarks = (landmarks : NormalizedLandmarkList[]) => {
        }


        this.connectionHandler.onStreamsReceived = this.onStreamsReceived.bind(this);
        this.connectionHandler.onStreamStopped = this.onStreamStopped.bind(this);
        
        this.connectionHandler.onPeerConnected = ((peerID : number) => {
            this.addPeer(peerID);
        }).bind(this);

        this.connectionHandler.onPeerDisconnected = ((peerID : number) => {
            this.removePeer(peerID);
        }).bind(this);


        this.connectionHandler.requestWebcamStream = ()=>{
            return this.videoHandlers[this.connectionHandler.ownID].getStream();
        }

        this.connectionHandler.onConnection = ()=>{};
        this.connectionHandler.onOwnIDReceived = (ownID) => {
            this.addPeer(ownID, true);

            this.videoHandlers[this.connectionHandler.ownID].onFrameChanged = (video)=> {
                //this.featureExtraction.getFeatures(video);
            };

            this.videoHandlers[this.connectionHandler.ownID].startWebcam();

        };

        this.connectionHandler.init(this.WS_ADDR);

       
    }

    private addPeer(peerID : number, self? : boolean){
        let li = document.createElement("li");
        let video = document.createElement("video");
        let p = document.createElement("p");

        video.id = "peer-video-" + peerID;
        video.width = 480;
        video.height = 360;
        video.autoplay = true;
        p.innerHTML = "Peer " + peerID + (self==true? " [me]" : "");
        li.id = "peer-item-" + peerID;

        li.appendChild(video);
        li.appendChild(p);

        document.getElementById("peer-videos").appendChild(li);
        this.videoHandlers[peerID] = new VideoHandler("peer-video-" + peerID);
    }

    private removePeer(peerID : number, self? : boolean){
        document.getElementById("peer-item-" + peerID).remove();
    }

    private onStreamsReceived(peerID : number, streams : readonly MediaStream[]){
        console.log("stream received");
        this.videoHandlers[peerID].startStreams(streams);
    }

    private onStreamStopped(peerID : number){
        console.log("stopp " + peerID);
        this.videoHandlers[peerID].stopStreams();
    }
}

let a = new Sender();
import {VideoHandler} from "./etc/video_handler";
import { DomElement } from "./ws/html_types";
import { FeatureExtraction } from "./etc/feature_extraction";
import { Data, VideoConference } from "./ws/video_conference";

const B_TO_MB = 0.000001;

class App{
    private readonly videoHandlers : Array<VideoHandler>;
    private readonly featureExtraction;
    private readonly videoConference;
    private readonly wsAddr = "ws://127.0.0.1:2222";
    private readonly textPeer = "Peer";
    private readonly textMe = "[me]";
    private readonly videoWidth = 480;
    private readonly videoHeight = 360;
    
    constructor(){
        this.videoHandlers = new Array<VideoHandler>();
        this.featureExtraction = new FeatureExtraction();
        this.videoConference = new VideoConference(this.wsAddr);

        this.featureExtraction.onFaceLandmarks = (landmark)=>{

        }

        this.videoConference.onPeerConnected = ((peerId : number) => {
            console.log("add peer: " + peerId)
            this.addPeer(peerId);
        });

        this.videoConference.onPeerDisconnected = ((peerId : number) => {
            this.removePeer(peerId);
        });

        this.videoConference.onVideoRequest = ()=>{
            return this.videoHandlers[this.videoConference.peerId].getStream();
        }

        this.videoConference.onPeerData = ((peerId : number, type : Data, data : any) => {
            switch(type){
                case Data.VIDEO_START:
                    this.videoHandlers[peerId].startStreams(data)
                    console.info("stream received from: " + peerId);
                    break;

                case Data.VIDEO_END:
                    console.info("stream stopped from: " + peerId);
                    this.videoHandlers[peerId].stopStreams();
                    break;
                default:

            }
        })

        window.setInterval(() => {this.updateStats()}, 1000)




        this.videoConference.onConnected = (async () => {
            this.addPeer(this.videoConference.peerId, true);
            await this.videoHandlers[this.videoConference.peerId].startWebcam();
        })


        document.getElementById(DomElement.BT_INIT_CALL).onclick = (()=>{
            this.videoConference.call(parseInt(prompt('peer id:')));
        })

        document.getElementById(DomElement.SL_VIDEO_MODE).onchange = ((ev : Event)=>{
            this.videoConference.changeTransmissionMode(parseInt((document.getElementById(DomElement.SL_VIDEO_MODE) as HTMLSelectElement).value));
        })

        this.init();       
    }


    private  updateStats(){

        this.videoConference.peers.forEach(async (peer) => {
            let id = this.videoConference.peers.indexOf(peer);
            
            let report = await peer.getStats();
            let stat = "";

            report.forEach((item)=>{
               

                if(item.type == 'data-channel'){
                    stat += "data-channel: ↓" + (item.bytesReceived * B_TO_MB).toFixed(2) + " MB ↑" + (item.bytesSent * B_TO_MB).toFixed(2) + " MB";
                }

                if(item.type == 'inbound-rtp'){


                    stat += "<br>video: ↓" + (item.bytesReceived * B_TO_MB).toFixed(2) + " MB";
                }


                //item.type == 'track' || item.type == 'inbound-rtp' || item.type  == 'transport' ||
                document.getElementById(DomElement.PREFIX_PEER_STATS + id).innerHTML = stat;
            })
        });
      
    }

    


    private async init(){
        
    }

  

    private addPeer(peerId : number, self? : boolean){
        let li = document.createElement("li");
        let video = document.createElement("video");
        let p = document.createElement("p");
        let stats = document.createElement("p");
        video.id = DomElement.PREFIX_PEER_VIDEO + peerId;
        video.width = this.videoWidth;
        video.height = this.videoHeight;
        video.autoplay = true;
        stats.id = DomElement.PREFIX_PEER_STATS + peerId;
        p.innerHTML = `${this.textPeer} ${peerId} ${self==true? this.textMe : ""}`;
        li.id = DomElement.PREFIX_PEER_ITEM + peerId;
        li.appendChild(video);
        li.appendChild(p);
        li.appendChild(stats);

        document.getElementById(DomElement.UL_PEER_ITEMS).appendChild(li);
        this.videoHandlers[peerId] = new VideoHandler(DomElement.PREFIX_PEER_VIDEO + peerId);
    }

    private removePeer(peerId : number){
        document.getElementById(DomElement.PREFIX_PEER_ITEM + peerId).remove();
    }

}

let app = new App();
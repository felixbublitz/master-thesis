import { DomElement } from "./ws/html_types";
import { FeatureExtraction } from "./etc/feature_extraction";
import { Data, VideoConference } from "./ws/video_conference";
import { RenderData, Renderer } from "./renderer";
import { VideoStream } from "./etc/video_stream";

const B_TO_KB = 0.001;

class App{
    private readonly renderer : Array<Renderer>;
    private readonly featureExtraction;
    private videoConference : VideoConference;
    private readonly wsAddr = "ws://192.168.178.10:2222";
    private readonly textPeer = "Peer";
    private readonly textMe = "[me]";
    private readonly videoWidth = 480;
    private readonly videoHeight = 360;
    private readonly ownStream : VideoStream;
    
    constructor(){
        this.renderer = new Array<Renderer>();
        this.featureExtraction = new FeatureExtraction();
        this.ownStream = new VideoStream();
        this.init();
    }

    private async init(){
        await this.ownStream.startWebcam();
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
            return this.ownStream.getStream();
        }

        this.videoConference.onPeerData = ((peerId : number, type : Data, data : any) => {
            switch(type){
                case Data.VIDEO_START:
                    this.renderer[peerId].setMode(Renderer.Mode.Video);
                    this.renderer[peerId].render(new RenderData(RenderData.Type.Video, data));
                    console.info("stream received from: " + peerId);
                    break;

                case Data.VIDEO_END:
                    this.renderer[peerId].clear();
                    console.info("stream stopped from: " + peerId);
                    break;
                default:

            }
        })

        window.setInterval(() => {this.updateStats()}, 1000)

        this.videoConference.onConnected = (async () => {
            this.addPeer(this.videoConference.peerId, true);
            this.renderer[this.videoConference.peerId].setMode(Renderer.Mode.Video);
            this.renderer[this.videoConference.peerId].render(new RenderData(RenderData.Type.Video, this.ownStream.getStream()));
        })


        document.getElementById(DomElement.BT_INIT_CALL).onclick = (()=>{
            this.videoConference.call(parseInt(prompt('peer id:')));
        })

        document.getElementById(DomElement.SL_VIDEO_MODE).onchange = ((ev : Event)=>{
            this.videoConference.changeTransmissionMode(parseInt((document.getElementById(DomElement.SL_VIDEO_MODE) as HTMLSelectElement).value));
        })

  
    }


    private  updateStats(){

        this.videoConference.peers.forEach(async (peer) => {
            let id = this.videoConference.peers.indexOf(peer);
            
            let report = await peer.getStats();
            let stat = "";
            let own_stat = "";


            report.forEach((item)=>{


                if(item.type == 'data-channel'){
                    //stat += "data-channel: ↓" + (item.bytesReceived * B_TO_MB).toFixed(2) + " MB ↑" + (item.bytesSent * B_TO_MB).toFixed(2) + " MB";
                }

                if(item.type == 'inbound-rtp'){
                    console.log(item);
                    stat += "decoding: " + ((item.totalDecodeTime/item.framesDecoded)*1000).toFixed(2) + " ms <br> received: " + ((item.bytesReceived/item.framesReceived)*item.framesPerSecond * B_TO_KB).toFixed(2) + " KB/s<br>fps: " + item.framesPerSecond;
                }

                if(item.type == 'outbound-rtp'){
                    console.log(item);

                    own_stat += "encoding: " + ((item.totalEncodeTime/item.framesSent)*1000).toFixed(2) + " ms<br>delay: " + ((item.totalPacketSendDelay/item.framesSent)*1000).toFixed(2);
                }

            
                //item.type == 'track' || item.type == 'inbound-rtp' || item.type  == 'transport' ||
                document.getElementById(DomElement.peerStats(id)).innerHTML = stat;
                document.getElementById(DomElement.peerStats(this.videoConference.peerId)).innerHTML = own_stat;
            })
        });
      
    }

    



  

    private addPeer(peerId : number, self? : boolean){
        let item = document.createElement("li");
        let title = document.createElement("p");
        let stats = document.createElement("p");
        let content = document.createElement("div");
        
        stats.id = DomElement.peerStats(peerId);
        title.innerHTML = `${this.textPeer} ${peerId} ${self==true? this.textMe : ""}`;
        item.id = DomElement.peerItem(peerId);
        content.id = DomElement.peerContent(peerId);

        item.appendChild(content);
        item.appendChild(title);
        item.appendChild(stats);

        this.renderer[peerId] = new Renderer(content);

        document.getElementById(DomElement.UL_PEER_ITEMS).appendChild(item);
        
    }

    private removePeer(peerId : number){
        document.getElementById(DomElement.peerItem(peerId)).remove();
    }

}

let app = new App();
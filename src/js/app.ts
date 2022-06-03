import { DomElement } from "./ws/html_types";
import { Encoder } from "./video/encoder";
import { Data, VideoConference } from "./etc/video_conference";
import { RenderObject, Renderer } from "./video/renderer";
import { VideoStream } from "./video/video_stream";
import { TimeAnalysis } from "./etc/time_analysis";

const B_TO_KB = 0.001;

class App{
    private readonly renderer : Array<Renderer>;
    private readonly timeAnalysis: TimeAnalysis;
    private readonly encoder;
    private videoConference : VideoConference;
    private readonly wsAddr = "ws://192.168.178.10:2222";
    private readonly textPeer = "Peer";
    private readonly textMe = "[me]";
    private readonly ownStream : VideoStream;
    
    constructor(){
        this.renderer = new Array<Renderer>();
        this.encoder = new Encoder();
        this.ownStream = new VideoStream();
        this.timeAnalysis = new TimeAnalysis();
        this.init();
    }

    private async init(){
        await this.ownStream.startWebcam(480,360);
        this.videoConference = new VideoConference(this.wsAddr);
    
        this.encoder.onFaceLandmarks = (landmark)=>{

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
                    this.renderer[peerId].render(new RenderObject(RenderObject.Type.RtcVideo, data));
                    console.info("stream received from: " + peerId);
                    break;

                case Data.VIDEO_END:
                    this.renderer[peerId].clear();
                    console.info("stream stopped from: " + peerId);
                    break;
                default:

            }
        })

        this.videoConference.onConnected = (async () => {
            this.addPeer(this.videoConference.peerId, true);
            this.renderer[this.videoConference.peerId].setMode(Renderer.Mode.Video);
            this.renderer[this.videoConference.peerId].render(new RenderObject(RenderObject.Type.Video, {stream: this.ownStream.getStream()}));
        })

        document.getElementById(DomElement.BT_INIT_CALL).onclick = (()=>{
            this.videoConference.call(parseInt(prompt('peer id:')));
        })

        document.getElementById(DomElement.SL_VIDEO_MODE).onchange = ((ev : Event)=>{
            this.videoConference.changeTransmissionMode(parseInt((document.getElementById(DomElement.SL_VIDEO_MODE) as HTMLSelectElement).value));
        })

        window.setInterval(() => {this.updateStats()}, 1000)
    }


    private  updateStats(){

        this.timeAnalysis.newRecord();
        
        const encodingStats = this.encoder.getTimeSample();

        if(this.videoConference.connectionHandler != null){
            this.videoConference.peers.forEach(async (peer, peerID)=>{
                const networkStats = await this.videoConference.connectionHandler.getTimeSample(peerID);
                this.timeAnalysis.add('transmission [Peer ' + peerID + ']', networkStats.items.get('transmissionTime'));
            })
        }


        this.renderer.forEach((renderer, peerID) => {
            try{
                const renderTimeSample =  renderer.getTimeSample();
                this.timeAnalysis.add('decoding [Peer ' + peerID + ']', renderTimeSample.items.get('decoding'));
            }catch(e){

            }
            
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
import { DomElement } from "./ws/html_types";
import { Encoder } from "./video/encoder";
import { Data, VideoConference } from "./etc/video_conference";
import { RenderObject, Renderer, VideoStream } from "./video/renderer";
import { PerformanceStatistic } from "./etc/performance";
import { CallMode } from "./ws/connection_types";

const B_TO_KB = 0.001;

class App{
    private readonly renderer : Array<Renderer>;
    private readonly performanceStatistic: PerformanceStatistic;
    private readonly encoder;
    private videoConference : VideoConference;
    private readonly wsAddr = "ws://192.168.178.10:2222";
    private readonly textPeer = "Peer";
    private readonly textMe = "[me]";
    
    constructor(){
        this.renderer = new Array<Renderer>();
        this.encoder = new Encoder(); 
        this.performanceStatistic = new PerformanceStatistic();
        this.init();
    }

    private async init(){
        this.videoConference = new VideoConference(this.wsAddr);
        this.videoConference.setEncoder(this.encoder);

        this.videoConference.onPeerConnected = ((peerId : number) => {
            console.log("add peer: " + peerId)
            this.addPeer(peerId);
        });

        this.videoConference.onPeerDisconnected = ((peerId : number) => {
            this.removePeer(peerId);
        });


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
            let stream = await this.encoder.getStream();
            this.renderer[this.videoConference.peerId].render(new RenderObject(RenderObject.Type.Video, {stream: stream}));
        })

        document.getElementById(DomElement.BT_INIT_CALL).onclick = (()=>{
            this.videoConference.call(parseInt(prompt('peer id:')));
        })

        document.getElementById(DomElement.BT_EXPORT).onclick = (()=>{
            this.performanceStatistic.export();
        })

        document.getElementById(DomElement.SL_VIDEO_MODE).onchange = ((ev : Event)=>{
            this.videoConference.changeTransmissionMode(parseInt((document.getElementById(DomElement.SL_VIDEO_MODE) as HTMLSelectElement).value));
        })

        window.setInterval(() => {this.updateStats()}, 1000)
    }


    private  updateStats(){

        let dataset = new PerformanceStatistic.Dataset();
        let sample;
        
        sample = this.encoder.getPerformanceSample();

        if(this.videoConference.connectionHandler != null){
            this.videoConference.peers.forEach(async (peer, peerID)=>{
                sample = await this.videoConference.connectionHandler.getPerformanceSample(peerID);
                if(sample.has('transmissionTime')) dataset.add('transmission [Peer ' + peerID + ']', sample.get('transmissionTime'));
            })
        }


        this.renderer.forEach((renderer, peerID) => {
            try{
                sample = renderer.getPerformanceSample();
                if(sample.has('decoding')) dataset.add('decoding [Peer ' + peerID + ']', sample.get('decoding'));
            }catch(e){

            }
            
        });

        console.log(dataset);
        this.performanceStatistic.add(dataset);
        
      
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
        delete this.renderer[peerId];
    }

}

let app = new App();
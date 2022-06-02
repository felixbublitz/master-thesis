import { DomElement } from "./ws/html_types";
import { Encoder } from "./etc/encoder";
import { Data, VideoConference } from "./etc/video_conference";
import { RenderObject, Renderer } from "./render/renderer";
import { VideoStream } from "./render/video_stream";
import { Stats } from "./etc/stats";

const B_TO_KB = 0.001;

class App{
    private readonly renderer : Array<Renderer>;
    private readonly stats: Stats;
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
        this.stats = new Stats();

        let peerStat = this.stats.addPeer(0);


        peerStat.beforSampleCreation = ()=>{
            
           // let report = await this.videoConference.peers[0].getStats();

            if(true){
               // report.indexOf();
            }

         /*   report.forEach((item)=>{

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
            }*/
        }

        //Stats.export("hallo");
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

        window.setInterval(() => {this.updateStats()}, 1000)

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

  
    }


    private  async updateStats(){

        const encodingStats = this.encoder.getStats();


        if(this.videoConference.connectionHandler != null){
            const networkStats = await this.videoConference.connectionHandler.getStats(0);
            const transmissionTime = networkStats.get('transmissionTime');
            console.log(transmissionTime);
        }


        this.renderer.forEach(async renderer => {
            try{
                const renderStats = await renderer.getStats();
                const decodingTime = renderStats.get('decodingTime')
                console.log(decodingTime);
            }catch(e){

            }
            
        });
        

        return;

        this.videoConference.peers.forEach(async (peer) => {
            let id = this.videoConference.peers.indexOf(peer);
            
            let report = await peer.getStats();
            let stat = "";
            let own_stat = "";

            (document as any).rep = report;

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
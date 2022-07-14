import { DomElement } from "./connectivity/html_types";
import { VideoConference } from "./video_conference";
import { Sheet } from "./measuring/sheet";
import { VideoRenderModel } from "./renderer/models/video_render_model";
import { FaceMaskCodec } from "./encoding/codecs/face_mask_codec";
import { FaceMaskRenderModel } from "./renderer/models/face_mask_render_model";
import { TransmissionModel } from "./transmission_model";
import { FaceMask3DRenderModel } from "./renderer/models/face_mask_3d_render_model";
import { FaceMaskCodec3d } from "./encoding/codecs/face_mask_codec_3d";

const wsAddr = "ws://127.0.0.1:2222";

class App{
    private readonly performanceSheet: Sheet;
    private videoConference : VideoConference;
    private readonly textPeer = "Peer";
    private readonly textMe = "[me]";
    private readonly STATS_INTERVAL = 5000;
    
    constructor(wsAddress : string){
        this.performanceSheet = new Sheet();
        this.videoConference = new VideoConference(wsAddress);

        //init available transmission models
        this.videoConference.addTransmissionModel({name : "Video", codec: null, renderModel: new VideoRenderModel()} as TransmissionModel)
        this.videoConference.addTransmissionModel({name : "FaceMask", codec: new FaceMaskCodec(), renderModel: new FaceMaskRenderModel()} as TransmissionModel)
        this.videoConference.addTransmissionModel({name : "FaceMask 3D", codec: new FaceMaskCodec3d(), renderModel: new FaceMask3DRenderModel()} as TransmissionModel)

        
        this.videoConference.onConnected = (async (dom : HTMLElement) => {
            this.addPeer(this.videoConference.peerId, dom, true);
        })

        this.videoConference.onPeerConnected = ((peerId : number, dom : HTMLElement) => {
            this.addPeer(peerId, dom);
        });

        this.videoConference.onPeerDisconnected = ((peerId : number) => {
            this.removePeer(peerId);
        });

        document.getElementById(DomElement.BT_INIT_CALL).onclick = (()=>{
            this.videoConference.call(parseInt(prompt('peer id:')));
        })

        document.getElementById(DomElement.BT_EXPORT).onclick = (()=>{
            this.performanceSheet.export('stats.csv');
        })
 
        for(let i=0; i<this.videoConference.transmissionModels.length; i++){
                const opt = document.createElement('option');
                opt.value = this.videoConference.transmissionModels[i].name;
                opt.innerText = this.videoConference.transmissionModels[i].name;
                document.getElementById(DomElement.SL_VIDEO_MODE).appendChild(opt);
        }

        document.getElementById(DomElement.SL_VIDEO_MODE).onchange = ((ev : Event)=>{
            this.videoConference.changeTransmissionModel((document.getElementById(DomElement.SL_VIDEO_MODE) as HTMLSelectElement).value);
        })

        window.setInterval(() => {this.updateStats()}, this.STATS_INTERVAL)
    }

    private async updateStats(){
        let row = new Sheet.Row();
       // let sample = await this.encoder.getPerformanceSample();

        //row.add("codec", this.videoConference.receivingModel.name);

        if(this.videoConference.connectionHandler != null){
            this.videoConference.peers.forEach(async (peer, peerID)=>{
               // sample = await this.videoConference.connectionHandler.getPerformanceSample(peerID);
                //if(sample.has('transmissionTime')) row.add('transmission [Peer ' + peerID + ']', sample.get('transmissionTime'));
            })
        }
        
        /*await Promise.all(this.renderer.map(async (renderer, peerID) => {
                sample = await renderer.getPerformanceSample();
                if(sample.has('decoding')) row.add('decoding [Peer ' + peerID + ']', sample.get('decoding'));
        }));*/

        this.performanceSheet.add(row);
        console.log(row.items);
    }

    private addPeer(peerId : number, renderDom : HTMLElement, self? : boolean){
        let item = document.createElement("li");
        let title = document.createElement("p");
        let stats = document.createElement("p");
        
        stats.id = DomElement.peerStats(peerId);
        title.innerHTML = `${this.textPeer} ${peerId} ${self==true? this.textMe : ""}`;
        item.id = DomElement.peerItem(peerId);
        renderDom.id = DomElement.peerContent(peerId);

        item.appendChild(renderDom);
        item.appendChild(title);
        item.appendChild(stats);

        document.getElementById(DomElement.UL_PEER_ITEMS).appendChild(item);
    }

    private removePeer(peerId : number){
        document.getElementById(DomElement.peerItem(peerId)).remove();
    }

}

let app = new App(wsAddr);
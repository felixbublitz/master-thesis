import { DomElement } from "./connectivity/html_types";
import { VideoConference } from "./video_conference";
import { Sheet } from "./measuring/sheet";
import { VideoRenderModel } from "./renderer/models/video_render_model";
import { TransmissionModel } from "./transmission_model";
import { MediapipeLandmarksCodec } from "./encoding/codecs/mediapipe_landmarks_codec";
import { WireframeRenderModel } from "./renderer/models/wireframe_render_model";
import { MediapipeExpressionCodec } from "./encoding/codecs/mediapipe_expression_codec";
import { ExpressionTransferRenderModel } from "./renderer/models/expression_transfer_render_model";
import { AffineReenactment } from "./renderer/models/affine_reenactment_render_model";
import { Parameter } from "./measuring/performance";


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
        this.videoConference.addTransmissionModel({name : "Wireframe", codec: new MediapipeLandmarksCodec(), renderModel: new WireframeRenderModel()} as TransmissionModel)
        this.videoConference.addTransmissionModel({name : "Reenactment (Affine)", codec: new MediapipeLandmarksCodec(), renderModel: new AffineReenactment()} as TransmissionModel)
        this.videoConference.addTransmissionModel({name : "Face Swap", codec: new MediapipeExpressionCodec(), renderModel: new ExpressionTransferRenderModel()} as TransmissionModel)
        this.videoConference.addTransmissionModel({name : "Reenactment (Affine)", codec: new MediapipeLandmarksCodec(), renderModel: new AffineReenactment()} as TransmissionModel)

        
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
        let sample;

        this.videoConference.peers.map((peer, peerID) => {
            document.getElementById(DomElement.peerStats(peerID)).innerText ="";

        });

        if(this.videoConference.connectionHandler != null){


            await Promise.all(this.videoConference.peers.map(async (peer, peerID) => {


                sample = await this.videoConference.encoder.getPerformanceSample();
                for(const param of sample.items){
                    row.add(param);
                }

                sample = await this.videoConference.connectionHandler.getPerformanceSample(peerID);
                for(const param of sample.items){
                    document.getElementById(DomElement.peerStats(peerID)).innerHTML += param.title + ': ' + param.value + ' ' + (param.unit==null?"":param.unit) + '<br>';
                    row.add(param);
                }
            }));

        }
        
        await Promise.all(this.videoConference.renderer.map(async (renderer, peerID) => {
                if(peerID == this.videoConference.peerId) return;
                sample = await renderer.getPerformanceSample();
                if(sample.has('render')){
                    const s = sample.get('render');
                    s.title = 'render [Peer ' + peerID + ']';
                    row.add(s);
                } 
        }));
        //console.clear();
        row.print();
        this.performanceSheet.add(row);
    }
    

    private addPeer(peerId : number, renderDom : HTMLElement, self? : boolean){
        let item = document.createElement("li");
        let title = document.createElement("p");
        let stats = document.createElement("p");
        
        stats.id = DomElement.peerStats(peerId);
        title.innerHTML = `${this.textPeer} ${peerId} ${self==true? this.textMe : ""}`;
        item.id = DomElement.peerItem(peerId);
        item.style.position = "relative";

        renderDom.id = DomElement.peerContent(peerId);
        renderDom.style.minWidth = "320px";
        renderDom.style.minHeight = "180px";
        renderDom.style.background = "#0053cf";

        stats.style.display = "block";
        stats.style.position = "absolute";
        stats.style.top = "4px";
        stats.style.left = "4px";
        stats.style.background = "none";
        stats.style.width = "320px";
        stats.style.height = "240px";
        stats.style.fontSize = "10px";
        stats.style.textAlign = "left";
        stats.style.opacity = "0.7";


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
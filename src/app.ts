import config from "./config";
import { DomElement } from "./connectivity/html_types";
import { VideoConference } from "./video_conference";
import { Sheet } from "./measuring/sheet";
import { VideoRenderModel } from "./renderer/models/video_render_model";
import { TransmissionModel } from "./transmission_model";
import { MediapipeLandmarksCodec } from "./encoding/codecs/mediapipe_landmarks_codec";
import { WireframeRenderModel } from "./renderer/models/wireframe_render_model";
import { MediapipeExpressionCodec } from "./encoding/codecs/mediapipe_expression_codec";
import { ExpressionTransferRenderModel } from "./renderer/models/expression_transfer_render_model";
import { Replica3DRenderModel } from "./renderer/models/replica3d_render_model";
import { MediapipeTransformedLandmarksCodec } from "./encoding/codecs/mediapipe_transformed_landmarks_codec";
import { BlendshapeRendermodel } from "./renderer/models/blendshape_render_model";
import { MediapipeBlendshapeCodec } from "./encoding/codecs/mediapipe_blendshape_codec";

class App{
    private readonly performanceSheet: Sheet;
    private videoConference : VideoConference;
    
    constructor(serverAddress : string, serverPort : number){
        this.performanceSheet = new Sheet(); 
        this.videoConference = new VideoConference(`ws://${serverAddress}:${serverPort}`);

        //init available transmission models
        this.videoConference.addTransmissionModel({name : "Video", codec: null, renderModel: new VideoRenderModel()} as TransmissionModel)
        this.videoConference.addTransmissionModel({name : "Wireframe", codec: new MediapipeLandmarksCodec(), renderModel: new WireframeRenderModel()} as TransmissionModel)
        this.videoConference.addTransmissionModel({name : "Face Swap", codec: new MediapipeExpressionCodec(), renderModel: new ExpressionTransferRenderModel()} as TransmissionModel)
        this.videoConference.addTransmissionModel({name : "Puppetry (Rigged)", codec: new MediapipeTransformedLandmarksCodec(), renderModel: new Replica3DRenderModel()} as TransmissionModel)
        this.videoConference.addTransmissionModel({name : "Puppetry (Blendshape)", codec: new MediapipeBlendshapeCodec(), renderModel: new BlendshapeRendermodel()} as TransmissionModel)

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
            this.videoConference.call(parseInt(prompt(config.TEXT_INSERT_PEER_ID)));
        })

        document.getElementById(DomElement.BT_EXPORT).onclick = (()=>{
            this.performanceSheet.export(config.STATS_EXPORT_FILE_NAME);
        })
 
        for(const transmissionModel of this.videoConference.transmissionModels){
                const option = document.createElement('option');
                option.value = transmissionModel.name;
                option.innerText = transmissionModel.name;
                document.getElementById(DomElement.SL_VIDEO_MODE).appendChild(option);
        }

        document.getElementById(DomElement.SL_VIDEO_MODE).onchange = ((ev : Event)=>{
            this.videoConference.changeTransmissionModel((document.getElementById(DomElement.SL_VIDEO_MODE) as HTMLSelectElement).value);
        })

        window.setInterval(() => {this.updateStats()}, config.STATS_INTERVAL)
    }

    private async updateStats(){
        let row = new Sheet.Row();
        let sample;

        this.videoConference.peers.map((peer, peerId) => {
            document.getElementById(DomElement.peerStats(peerId)).innerText ="";

        });

        if(this.videoConference.connectionHandler != null){
            await Promise.all(this.videoConference.peers.map(async (peer, peerId) => {
                sample = await this.videoConference.encoder.getPerformanceSample();
                for(const param of sample.items){
                    document.getElementById(DomElement.peerStats(peerId)).innerHTML += param.title + ': ' + param.value + ' ' + (param.unit==null?"":param.unit) + '<br>';
                    row.add(param);
                }
                sample = await this.videoConference.connectionHandler.getPerformanceSample(peerId);
                for(const param of sample.items){
                    document.getElementById(DomElement.peerStats(peerId)).innerHTML += param.title + ': ' + param.value + ' ' + (param.unit==null?"":param.unit) + '<br>';
                    row.add(param);
                }
            }));
        }
        
        await Promise.all(this.videoConference.renderer.map(async (renderer, peerId) => {
                if(peerId == this.videoConference.peerId) return;
                sample = await renderer.getPerformanceSample();
               
                for(const param of sample.items){
                    param.title = param.title + '-'+peerId;
                    document.getElementById(DomElement.peerStats(peerId)).innerHTML += param.title + ': ' + param.value + ' ' + (param.unit==null?"":param.unit) + '<br>';
                    row.add(param);
                }
    
        }));
        
        row.print();
        this.performanceSheet.add(row);
    }
    

    private addPeer(peerId : number, renderDom : HTMLElement, self? : boolean){
        let item = document.createElement("li");
        let title = document.createElement("p");
        let statsContainer = document.createElement("div");
        let stats = document.createElement("p");
        
        stats.id = DomElement.peerStats(peerId);
        title.innerHTML = `${config.TEXT_PEER} ${peerId} ${self==true? config.SELF_SIGNIFIER : ""}`;
        item.id = DomElement.peerItem(peerId);
        item.style.position = "relative";

        renderDom.id = DomElement.peerContent(peerId);
        renderDom.style.minWidth = "320px";
        renderDom.style.minHeight = "180px";
        renderDom.style.background = "#0053cf";

        statsContainer.style.display = "block";
        statsContainer.style.position = "absolute";
        statsContainer.style.top = "4px";
        statsContainer.style.left = "4px";
        statsContainer.style.background = "none";
        statsContainer.style.fontSize = "10px";
        statsContainer.style.textAlign = "left";
        statsContainer.style.opacity = "0.7";
        stats.style.position = "relative";
        stats.style.padding = "0";
        statsContainer.style.background = "0000008f";
        statsContainer.appendChild(stats);

        item.appendChild(renderDom);
        item.appendChild(title);
        item.appendChild(statsContainer);

        document.getElementById(DomElement.UL_PEER_ITEMS).appendChild(item);
    }

    private removePeer(peerId : number){
        document.getElementById(DomElement.peerItem(peerId)).remove();
    }

}

let app = new App(config.SERVER_ADDRESS, config.SERVER_PORT);
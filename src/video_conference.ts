import { Encoder } from "./encoding/encoder";
import { Renderer, RenderObject } from "./renderer/renderer";
import { ConnectionHandler } from "./connectivity/connection_handler";
import { AddressLabel, SocketPackage } from "./connectivity/connection_types";
import { RTCChannel } from "./connectivity/rtc_channel";
import { VideoRenderModel } from "./models/renderer/video_render_model";
import { TransmissionModel } from "./models/transmission_model";

export class VideoConference{
    readonly connectionHandler;
    readonly encoder : Encoder;
    readonly renderer : Array<Renderer>;
    transmissionModels : Array<TransmissionModel>;
    receivingModel : TransmissionModel;

    onConnected(dom : HTMLElement){};
    onPeerConnected(peerId : number, dom : HTMLElement){}
    onPeerDisconnected(peerId : number){}

    addTransmissionModel(model : TransmissionModel){
        this.transmissionModels.push(model);
    }

    get peerId() : number{
        return this.connectionHandler.ownID;
    }

    get peers() : RTCPeerConnection[]{
        return this.connectionHandler.getPeers();
    }

    constructor(wsAddr : string){
        this.transmissionModels = new Array<TransmissionModel>();
        const nModel = {name: "None"} as TransmissionModel;
        this.addTransmissionModel(nModel);
        this.receivingModel = nModel;

        this.connectionHandler = new ConnectionHandler(); 
        this.renderer = new Array<Renderer>();
        this.encoder = new Encoder(); 
        this.encoder.onFrameAvailable = (peerId, encoded) => {
            this.connectionHandler.sendRTCData(peerId, RTCChannel.DataType.FrameData, encoded)
        }

        this.connectionHandler.onStreamsReceived = (peerId,  streams, peer, statsKey) => {
            this.onEvent("render_update", {peerId: peerId, content: {stream : streams[0], peer : peer, statsKey : statsKey }});
        };

        this.connectionHandler.onPeerConnected = (peerId) => {
            let dom = document.createElement("div");
            this.renderer[peerId] = new Renderer(dom);
            this.onPeerConnected(peerId, dom)
        };
        this.connectionHandler.onPeerDisconnected = (peerId) => {
            delete this.renderer[peerId];
            this.onPeerDisconnected(peerId)
        };
        this.connectionHandler.onEvent = (ev, data) => {this.onEvent(ev,data)};

        this.connectionHandler.onIDReceived = async (ownId) => {
            let dom = document.createElement("div");
            this.renderer[this.peerId] = new Renderer(dom);
            this.renderer[this.peerId].setRenderModel(new VideoRenderModel());
            this.renderer[this.peerId].render(new RenderObject({stream: await this.encoder.getStream()}));
            this.onConnected(dom);
        };

        this.connectionHandler.init(wsAddr); 
    }

    private onEvent(ev : string, data : any){
        switch(ev){
            case 'start_transmission':
                this.startTransmission(data.peerId, this.getTransmissionModel(data.transmissionModelName));
                break;
            case 'stop_transmission':
                this.stopTransmission(data.peerId, this.getTransmissionModel(data.transmissionModelName));
                break;
            case 'start_reception':
                this.encoder.startDecoding(data.peerId);
                this.receivingModel = this.getTransmissionModel(data.transmissionModelName);
                this.renderer[data.peerId].setRenderModel(this.getTransmissionModel(data.transmissionModelName).renderModel);
                break;
            case 'stop_reception':
                this.encoder.stopDecoding(data.peerId);
                this.renderer[data.peerId].clear();
                break;
            case 'render_update':
                let decoded;
                if(data.content instanceof Int8Array) decoded = this.encoder.decode(this.receivingModel.codec, data.content, data.peerId)
                else decoded = new RenderObject(data.content);

                this.renderer[data.peerId].render(decoded);
                break;
            default:
        }
    }

    private getTransmissionModel(name : string) : TransmissionModel{
        for(const model of this.transmissionModels){
            if(model.name == name)
                return model;
        }
        return null;
    }

    async call(peerId : number) : Promise<void>{
        return new Promise((resolve, reject)=>{
            if(peerId == this.connectionHandler.ownID){
                reject('illegal peer id');
                return;
            }
            this.connectionHandler.AwaitReply(new SocketPackage('call', {peerId : peerId})).then((pkg : SocketPackage) => {     
                resolve();
            }, (error)=>{
                reject(error);
            });
        });
    }

    changeTransmissionModel(transmissionModelName : string){
        this.connectionHandler.AwaitReply(new SocketPackage('change_transmission_mode', {transmissionModelName : transmissionModelName})).then(()=>{},
        (e)=>{
            console.error(e);
        });
    }

    private async startTransmission(peerId : number, transmissionModel : TransmissionModel){
        this.connectionHandler.send(new SocketPackage('start_reception', {peerId : this.peerId, transmissionModelName : transmissionModel.name}, new AddressLabel(this.peerId, peerId)));

        if(transmissionModel.name == "Video"){
            let stream = await this.encoder.getStream();
            this.connectionHandler.addStream(peerId, stream);
            return;
        }

        this.encoder.start(peerId, transmissionModel.codec);
    }

    private stopTransmission(peerId : number, transmissionModel : TransmissionModel){
        if(transmissionModel == null) return;
        
        if(transmissionModel.name == "Video") this.connectionHandler.removeStream(peerId);
        this.encoder.stop(peerId); 
        this.connectionHandler.send(new SocketPackage('stop_reception', {peerId : this.peerId,  transmissionModelName : transmissionModel.name}, new AddressLabel(this.peerId, peerId)));
    }

}
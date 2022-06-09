
import { Encoder } from "../video/encoder";
import { Renderer, RenderObject } from "../video/renderer";
import { RenderMode } from "../video/render_types";
import { ConnectionHandler } from "../ws/connection_handler";
import { AddressLabel, RTCPackage, SocketPackage } from "../ws/connection_types";


export enum Data{
    StartReception,
    StopReception,
    Render,
}

export class VideoConference{
    readonly connectionHandler;
    private encoder : Encoder;

    onConnected(){};
    onPeerConnected(peerId : number){}
    onPeerDisconnected(peerId : number){}
    onPeerData(peerId : number, type : Data, data? : any){};


    get peerId() : number{
        return this.connectionHandler.ownID;
    }

    constructor(wsAddr : string){
        this.connectionHandler = new ConnectionHandler(); 
        
        this.connectionHandler.onStreamsReceived = (peerId,  streams, peer, statsKey) => {
            this.onPeerData(peerId, Data.Render, {renderObject: new RenderObject(RenderMode.Video, {stream : streams[0], peer : peer, statsKey : statsKey }, true)})
        };

        
        this.connectionHandler.onPeerConnected = (peerId) => {console.log("opc"); this.onPeerConnected(peerId)};
        this.connectionHandler.onPeerDisconnected = (peerID) => {this.onPeerDisconnected(peerID)};
        this.connectionHandler.onEvent = (ev, data) => {this.onEvent(ev,data)};

        this.connectionHandler.onIDReceived = (ownID) => {
            this.onConnected();
        };

        this.connectionHandler.init(wsAddr);

    }

    setEncoder(encoder : Encoder){
        this.encoder = encoder;

        encoder.onFrameAvailable = (peerId, data) => {
            
            let wireframe = new RTCPackage.WireFrameData();
            data.forEach((item : any)=>{
                wireframe.add({ x: item.x, y: item.y, z: item.z} as RTCPackage.Coordinates);
            })


            let pkg = new RTCPackage(RTCPackage.Type.WireframeData, wireframe);
            this.connectionHandler.sendRTCData(peerId, pkg)
        }
    }

    get peers() : RTCPeerConnection[]{
        return this.connectionHandler.getPeers();
    }


    private onEvent(ev : string, data : any){
        switch(ev){
            case 'start_transmission':
                this.startTransmission(data.peerId, data.mode);
                break;
            case 'stop_transmission':
                this.stopTransmission(data.peerId, data.mode);
                break;
            case 'start_reception':
                this.onPeerData(data.peerId, Data.StartReception, {mode : data.mode});
                break;
            case 'stop_reception':
                this.onPeerData(data.peerId, Data.StopReception);
                break;
            case 'render_update':
                this.onPeerData(data.peerId, Data.Render, {renderObject: new RenderObject(data.mode, data.content)});
            default:

        }
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

    
    changeTransmissionMode(mode : RenderMode){
        this.connectionHandler.AwaitReply(new SocketPackage('change_mode', {'mode' : mode})).then(()=>{},
        (e)=>{
            console.error(e);
        });
    }



    private async startTransmission(peerId : number, mode : RenderMode){
        this.connectionHandler.send(new SocketPackage('start_reception', {peerId : this.peerId, mode : mode}, new AddressLabel(this.peerId, peerId)));

        switch(mode){
            case RenderMode.None:
                break;
            case RenderMode.Video:
                console.log(this);
                let stream = await this.encoder.getStream();
                this.connectionHandler.addStream(peerId, stream);
                break;
            case RenderMode.FaceLandmarks:
                this.encoder.start(peerId, Encoder.Encoding.Wireframe);
                break;
            default:
                throw(new Error("render mode not available"));
        }
        
    }

 

    private stopTransmission(peerId : number, mode : RenderMode){
        switch(mode){
            case RenderMode.None:
                break;
            case RenderMode.Video:
                this.connectionHandler.removeStream(peerId);
                break;
            case RenderMode.FaceLandmarks:
                this.encoder.stop(peerId);
            break;

            default:   
        }
        this.connectionHandler.send(new SocketPackage('stop_reception', {peerId : this.peerId, mode : mode}, new AddressLabel(this.peerId, peerId)));
    }

}
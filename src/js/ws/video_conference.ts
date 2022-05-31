import { ConnectionHandler } from "./connection_handler";
import { AddressLabel, CallMode, SocketPackage } from "./connection_types";


export enum Data{
    VIDEO_START,
    VIDEO_END,
    LANDMARK
}

export class VideoConference{
    private readonly connectionHandler;

    onConnected(){};
    onPeerConnected(peerId : number){}
    onPeerDisconnected(peerId : number){}
    onPeerData(peerId : number, type : Data, data? : any){};


    get peerId() : number{
        return this.connectionHandler.ownID;
    }

    constructor(wsAddr : string){
        this.connectionHandler = new ConnectionHandler(); 
        
        this.connectionHandler.onStreamsReceived = (peerId,  streams) => {
            this.onPeerData(peerId, Data.VIDEO_START, streams)
        };

        this.connectionHandler.onStreamStopped = (peerId : number) => {
            this.onPeerData(peerId, Data.VIDEO_END);
        };
        
        this.connectionHandler.onPeerConnected = (peerId) => {console.log("opc"); this.onPeerConnected(peerId)};
        this.connectionHandler.onPeerDisconnected = (peerID) => {this.onPeerDisconnected(peerID)};
        this.connectionHandler.onEvent = (ev, data) => {this.onEvent(ev,data)};

        this.connectionHandler.onIDReceived = (ownID) => {
            this.onConnected();
        };

        this.connectionHandler.init(wsAddr);

    }

    private onEvent(ev : string, data : any){
        switch(ev){
            case 'start_transmission':
                this.startTransmission(data.peerId, data.mode);
                break;
            case 'stop_transmission':
                this.stopTransmission(data.peerId, data.mode);
                break;
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

    
    changeTransmissionMode(mode : CallMode){
        this.connectionHandler.AwaitReply(new SocketPackage('change_mode', {'mode' : mode})).then(()=>{},
        (e)=>{
            console.error(e);
        });
    }

    onVideoRequest() : MediaStream{
        throw("no video available");
    }

    private startTransmission(peerId : number, mode : CallMode){
        switch(mode){
            case CallMode.None:
                break;
            case CallMode.Video:
                this.connectionHandler.addStream(peerId, this.onVideoRequest());
                break;
            default:
                throw(new Error("call mode not implemented"));
        }
    }

    private stopTransmission(peerId : number, mode : CallMode){
        switch(mode){
            case CallMode.None:
                break;
            case CallMode.Video:
                this.connectionHandler.removeStream(peerId);
                this.connectionHandler.send(new SocketPackage('stream_stopped', null, new AddressLabel(this.connectionHandler.ownID, peerId)));
                break;
            case CallMode.Wireframe:
            break;

            default:
                
        }
    }

}
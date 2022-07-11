
import {WebSocket as WSWebSocket} from "ws";
import { SocketPackage } from "./connection_types";
import * as EventEmitter from "events";
import { CodecType } from "../encoding/types";


export class CallPeer extends EventEmitter{
    callSession : CallSession;
    readonly internal_id : number;
    private readonly socket : WSWebSocket;
    static init_peers = 0;
    private internalTransmissioModeName : string; 

    get type() : string{
        return this.internalTransmissioModeName;
    }

    get id() : number{
        return this.internal_id;
    }

    constructor(socket : WSWebSocket){
        super();
        this.internal_id = CallPeer.init_peers++;
        this.socket = socket;
    }

    changeTransmissionMode(transmissionModelName : string){
        console.info("change to mode: " + transmissionModelName);
        let lastMode = this.internalTransmissioModeName;
        this.internalTransmissioModeName = transmissionModelName;
        this.emit("modechanged", this,lastMode);
    }

    connectionEstablished(){
        this.emit("rtcestablished", this);
    }

    destroy(){
        if(this.callSession != null) this.callSession.leave(this);
    }
    

    send(pkg : SocketPackage){
        if(pkg.isReply()) console.info("Send reply: " + pkg.event + " to peer " + this.id);
        else console.info("Send event: " + pkg.event + " to peer " + this.id);
        this.socket.send(pkg.serialize());
    }

    reply(pkg : SocketPackage){

    }

}

export class CallSession{
    private readonly peers : Array<CallPeer>
    readonly id : number;

    constructor(){
        this.peers = new Array<CallPeer>();
    }

    private onModelChanged(triggerPeer : CallPeer, lastTransmissionModel : string){
        for(const peer of this.peers){
            if(peer != triggerPeer){
                peer.send(new SocketPackage('stop_transmission', {peerId : triggerPeer.id,  transmissionModelName : lastTransmissionModel}));
                peer.send(new SocketPackage('start_transmission', {peerId : triggerPeer.id,  transmissionModelName : triggerPeer.type}));
            }
        }
    }

    join(peer : CallPeer){
        peer.callSession = this;
        this.peers.push(peer);
        peer.on('modechanged', (peer, lastMode)=> {this.onModelChanged(peer, lastMode)});
        peer.on('rtcestablished', (peer) => {
            //this.sendTransmissionRequests(peer);
        })

        if(this.peers.length > 1){
            this.establishRTCConnection(peer);
        }
    }

    private establishRTCConnection(initiator : CallPeer){
        for(const peer of this.peers){
            if(peer.id != initiator.id) initiator.send(new SocketPackage('establish_rtc', {peerId : peer.id}));
        }
    }

    private sendTransmissionRequests(initiator : CallPeer){
        for(const peer of this.peers){
            if(peer.id != initiator.id){
                peer.send(new SocketPackage('start_transmission', {peerId : initiator.id, mode : initiator.type}));
                initiator.send(new SocketPackage('start_transmission', {peerId : peer.id, mode : peer.type}));
            }
        }
    }

    leave(triggerPeer : CallPeer){
        triggerPeer.callSession = null;
        this.peers.splice(this.peers.indexOf(triggerPeer), 1);

        for(const peer of this.peers){
            peer.send(new SocketPackage('disconnect', {'peerId' : triggerPeer.id}));
        }
    }
}
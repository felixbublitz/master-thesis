
import {WebSocket as WSWebSocket} from "ws";
import { CallMode, SocketPackage } from "./connection_types";
import * as EventEmitter from "events";


export class CallPeer extends EventEmitter{
    callSession : CallSession;
    readonly internal_id : number;
    private readonly socket : WSWebSocket;
    static init_peers = 0;
    private internal_mode = CallMode.None; 

    get mode() : CallMode{
        return this.internal_mode;
    }

    get id() : number{
        return this.internal_id;
    }

    constructor(socket : WSWebSocket){
        super();
        this.internal_id = CallPeer.init_peers++;
        this.socket = socket;
    }

    changeMode(mode : CallMode){
        console.info("change to mode: " + mode);
        let lastMode = this.internal_mode;
        this.internal_mode = mode;
        this.emit("modechanged", this,lastMode);
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

    private onModeChanged(triggerPeer : CallPeer, lastMode : CallMode){
        for(const peer of this.peers){
            if(peer != triggerPeer){
                peer.send(new SocketPackage('stop_transmission', {peerId : triggerPeer.id,  mode : lastMode}));
                peer.send(new SocketPackage('start_transmission', {peerId : triggerPeer.id,  mode : triggerPeer.mode}));
            }
        }
    }

    join(peer : CallPeer){
        peer.callSession = this;
        this.peers.push(peer);
        peer.on('modechanged', (peer, lastMode)=> {this.onModeChanged(peer, lastMode)});

        if(this.peers.length > 1){
            this.establishRTCConnection(peer);
            this.sendTransmissionRequests(peer);
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
                peer.send(new SocketPackage('start_transmission', {peerId : initiator.id, mode : initiator.mode}));
                initiator.send(new SocketPackage('start_transmission', {peerId : peer.id, mode : peer.mode}));
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
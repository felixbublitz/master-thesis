
import {WebSocket as WSWebSocket} from "ws";
import { CallMode, SocketPackage } from "./connection-types";
import * as EventEmitter from "events";


export class CallPeer extends EventEmitter{
    public callSession : CallSession;
    public readonly id : number;
    private readonly socket : WSWebSocket;
    static init_peers : number = 0;
    private _mode : CallMode = CallMode.None; 

    get mode() : CallMode{
        return this._mode;
    }

    public constructor(socket : WSWebSocket){
        super();
        this.id = CallPeer.init_peers++;
        this.socket = socket;
    }

    public changeMode(mode : CallMode){
        console.log("change to mode: " + mode);
        let lastMode = this._mode;
        this._mode = mode;
        this.emit("modechanged", this, lastMode);
    }

    public destroy(){
        if(this.callSession != null)
        this.callSession.leave(this);
    }
    

    public send(pkg : SocketPackage){
        this.socket.send(pkg.serialize());
    }

    public reply(pkg : SocketPackage){

    }

}

export class CallSession{
    private readonly peers : Array<CallPeer>
    public readonly id : number;

    constructor(){
        this.peers = new Array<CallPeer>();
    }

    private onModeChanged(triggerPeer : CallPeer, lastMode : CallMode){
        this.peers.forEach((peer)=>{
            if(peer != triggerPeer){
                peer.send(new SocketPackage('stop_transmission', {peerID : triggerPeer.id,  mode : lastMode}));
                peer.send(new SocketPackage('start_transmission', {peerID : triggerPeer.id,  mode : triggerPeer.mode}));
            }
        })
    }

    public join(peer : CallPeer){
        peer.callSession = this;
        this.peers.push(peer);
        peer.on('modechanged', this.onModeChanged.bind(this));

        if(this.peers.length > 1){
            this.sendTransmissionRequests(peer);
        }
    }

    private sendTransmissionRequests(initiator : CallPeer){
        this.peers.forEach((peer) => {
            if(peer.id != initiator.id){
                peer.send(new SocketPackage('start_transmission', {peerID : initiator.id, mode : initiator.mode}));
                initiator.send(new SocketPackage('start_transmission', {peerID : peer.id, mode : peer.mode}));
            }
        });
    }

    public leave(triggerPeer : CallPeer){
        triggerPeer.callSession = null;
        this.peers.splice(this.peers.indexOf(triggerPeer), 1);

        this.peers.forEach((peer)=>{
            peer.send(new SocketPackage('disconnect', {'peerID' : triggerPeer.id}));
        })
    }
}
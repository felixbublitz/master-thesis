import { AddressLabel, AdrSocket, SocketPackage } from "./connection-types";

const logging = require('webpack/lib/logging/runtime');
let logger = logging.getLogger("connection-handler");


export class ConnectionHandler{
    private server : WebSocket;
    private ownID : number;
    private iceSetupDone = false;
    private readonly ICE_SERVERS = [{urls: "stun:stun.stunprotocol.org"}];
    private peers : Array<RTCPeerConnection> = [];

    public onConnection(){}
    public onStreamsReceived(peerID : number, streams : readonly MediaStream[]){}

    public init(addr : string, receiver : number){
        this.server = new WebSocket(addr); 
        this.server.onopen = this.open.bind(this);
        this.server.onerror = this.error.bind(this);
        this.server.onmessage = this.receive.bind(this);
    }

    private open(){
        logger.info("Connected to server");
        this.server.send(new SocketPackage('register').serialize());
    }

    private connectTo(peerID : number){
        this.peers[peerID] = this.createPeer(peerID);
    }

    private createPeer(peerID : number){
        let peer = new RTCPeerConnection({iceServers : this.ICE_SERVERS});
        peer.onicecandidate = this.onICECandidate.bind(this)(peerID);
        peer.ontrack = (ev) => this.onStreamsReceived.bind(this)(peerID, ev.streams);
        peer.onnegotiationneeded = () => this.onNegotiationNeeded.bind(this)(peerID);
        return peer;
    }

    private async onNegotiationNeeded(peerID : number){
        const peerOffer = await this.peers[peerID].createOffer();
        await this.peers[peerID].setLocalDescription(new RTCSessionDescription(peerOffer));
        this.server.send(new SocketPackage('offer', {peerID: peerID, offer: peerOffer}, new AddressLabel(this.ownID, peerID)).serialize());
    }
    
    private receive(message : MessageEvent, peer : AdrSocket){
        let pkg  = SocketPackage.deserialize(message.data.toString());
        logger.info("Received event: " + pkg.event);

        switch(pkg.event){
            case 'register-re':
                this.ownID = pkg.data.id;
                logger.log("Registered as peer: " + this.ownID);
                this.onConnection();
                break;
            case 'offer':
                this.offer(pkg.data);
                break;
            case 'answer':
                this.answer(pkg.data);
                break;
            case 'remoteIceCandidate':
                this.remoteIceCandidate(pkg.data);
                break;
            case 'error':
                this.error(pkg.data.message);
                break;
        }            
    }

    private error(message : string){
        logger.error(message);
    }

    private onICECandidate(peerID : number, event : RTCPeerConnectionIceEvent){
        if (event.candidate !== null){
            this.iceSetupDone = true;
            this.server.send(new SocketPackage('remoteIceCandidate', {peerID : this.ownID, candidate : event.candidate}, new AddressLabel(this.ownID, peerID)).serialize());
        }
    }

    private async remoteIceCandidate(data : any){
        try {
            await this.peers[data.peerID].addIceCandidate(data.candidate);
          } catch (error) {
            this.error(error);
          }
    }

    private async offer(data : any){
        if(this.peers[data.peerID] === null)
            this.peers[data.peerID] = this.createPeer(data.peerID);

        await this.peers[data.peerID].setRemoteDescription(new RTCSessionDescription(data.offer));
        const peerAnswer = await this.peers[data.peerID].createAnswer();
        await this.peers[data.peerID].setLocalDescription(new RTCSessionDescription(peerAnswer));
        this.server.send(new SocketPackage('answer', {peerID : data.peerID, answer: peerAnswer}, new AddressLabel(this.ownID, data.peerID)).serialize());
    }

    private async answer(data : any){
        await this.peers[data.peerID].setRemoteDescription(new RTCSessionDescription(data.answer));
    }



    public sendVideo(peerID: number, stream : MediaStream){
        stream.getTracks().forEach(track => {
            this.peers[peerID].addTrack(track, stream);
        });
    }
    
}
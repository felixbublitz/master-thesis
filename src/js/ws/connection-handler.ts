import { resolve } from "url";
import { AddressLabel, AdrSocket, SocketPackage } from "./connection-types";

const logging = require('webpack/lib/logging/runtime');
let logger = logging.getLogger("connection-handler");


export class ConnectionHandler{
    private server : WebSocket;
    public ownID : number;
    private iceSetupDone = false;
    private readonly ICE_SERVERS = [{urls: "stun:stun.stunprotocol.org"}];
    private peers : Array<RTCPeerConnection> = [];

    public onConnection(peerID : number){}
    public onOwnIDReceived(ownID : number){};
    public onStreamsReceived(peerID : number, streams : readonly MediaStream[]){}

    public init(addr : string){
        this.server = new WebSocket(addr); 
        this.server.onopen = this.open.bind(this);
        this.server.onerror = this.error.bind(this);
        this.server.onmessage = this.receive.bind(this);
    }

    private open(){
        logger.info("Connected to server");
        this.AwaitReply(new SocketPackage('register')).then(
           (function(pkg : SocketPackage){
                this.ownID = pkg.data.id;
                this.onOwnIDReceived(pkg.data.id);
                logger.log("Registered as peer: " + this.ownID);
            }.bind(this)),
            (function(){
                this.error("internal server error");
            }).bind(this)
        );
    }

    private async AwaitReply(original_pck : SocketPackage) : Promise<SocketPackage>{
        console.log(original_pck.id);
        return new Promise((resolve, reject) => {
            let timeout = setTimeout((function(){
                this.server.removeEventListener('message', callback, false);
                reject("await reply timeout")
                return;
            }).bind(this), 2000);

           
           let callback = (function(message : MessageEvent){
               let reply_pkg  = SocketPackage.deserialize(message.data.toString());
               if(reply_pkg.id == original_pck.id + "_re"){
                    clearTimeout(timeout);
                    this.server.removeEventListener('message', callback, false);
                    resolve(reply_pkg);
                    return;
                }
            }).bind(this);
           
            this.server.addEventListener('message', callback);

            this.server.send(original_pck.serialize());

            
        })
    }

    private async establishConnection(peerID : number) : Promise<void>{

        return new Promise((resolve, reject)=>{

            if(peerID == this.ownID){
                reject('illegal peer id');
                return;
            }
    
            this.AwaitReply(new SocketPackage('peer_exists', {peerID : peerID})).then((function(pkg : SocketPackage){
                if(pkg.data.exists != true){
                    reject("peer does not exist");
                    return;
                }

                if(this.peers[peerID] == null)
                    this.peers[peerID] = this.createPeer(peerID);
                    
                resolve();
            }).bind(this), (error)=>{
                reject(error);
            });

    });
    }

    private createPeer(peerID : number){
        let peer = new RTCPeerConnection({iceServers : this.ICE_SERVERS});
        peer.onicecandidate = (ev) => this.onICECandidate.bind(this)(peerID, ev);
        peer.ontrack = (ev) => this.onStreamsReceived.bind(this)(peerID, ev.streams);
        peer.onnegotiationneeded = () => this.onNegotiationNeeded.bind(this)(peerID);
        return peer;
    }

    private async onNegotiationNeeded(peerID : number){
        const peerOffer = await this.peers[peerID].createOffer();
        await this.peers[peerID].setLocalDescription(new RTCSessionDescription(peerOffer));
        
        this.AwaitReply(new SocketPackage('offer', {peerID: this.ownID, offer: peerOffer}, new AddressLabel(this.ownID, peerID))).then((async function(pkg : SocketPackage){
            console.log(pkg.data.answer);
            await this.peers[peerID].setRemoteDescription(new RTCSessionDescription(pkg.data.answer));
            this.onConnection(peerID);
        }).bind(this));
    }
    
    private receive(message : MessageEvent, peer : AdrSocket){
        let pkg  = SocketPackage.deserialize(message.data.toString());
        logger.info("Received event: " + pkg.event + " [" + pkg.id + "]");

        switch(pkg.event){
            case 'offer':
                this.offer(pkg);
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
            console.log(data.peerID);
            console.log(this.peers);
            await this.peers[data.peerID].addIceCandidate(data.candidate);
          } catch (error) {
            logger.debug("cant find peer " + data.peerID);
            this.error(error);
          }
    }

    private async offer(pkg : any){
        if(this.peers[pkg.data.peerID] == null){
            this.peers[pkg.data.peerID] = this.createPeer(pkg.data.peerID);
            console.log("created peer " + pkg.data.peerID);
        }

        console.log("peer " + pkg.data.peerID + " exists");
        console.log(this.peers);

        await this.peers[pkg.data.peerID].setRemoteDescription(new RTCSessionDescription(pkg.data.offer));
        const peerAnswer = await this.peers[pkg.data.peerID].createAnswer();
        await this.peers[pkg.data.peerID].setLocalDescription(new RTCSessionDescription(peerAnswer));

        this.server.send(pkg.reply({answer: peerAnswer}).serialize());
    }



    public async sendVideo(peerID: number, stream : MediaStream){
        this.establishConnection(peerID).then(()=>{
            stream.getTracks().forEach(track => {
                this.peers[peerID].addTrack(track, stream);
            });
        }, (error)=>{
            this.error(error);
        });
    }
    
}
import { AddressLabel, AdrSocket, CallMode, SocketPackage } from "./connection-types";

const logging = require('webpack/lib/logging/runtime');
let logger = logging.getLogger("connection-handler");

export class ConnectionHandler{
    private server : WebSocket;
    public readonly ownID : number;
    private readonly iceServers = [{urls: "stun:stun.stunprotocol.org"}];
    private readonly peers : Array<RTCPeerConnection> = [];


    public onIDReceived(ownID : number){};
    public onStreamsReceived(peerID : number, streams : readonly MediaStream[]){};
    public onStreamStopped(peerID : number){};
    public onPeerConnected(peerID : number){};
    public onPeerDisconnected(peerID : number){};

    public init(addr : string){
        this.server = new WebSocket(addr); 
        this.server.onopen = this.onConnection.bind(this);
        this.server.onerror = this.error.bind(this);
        this.server.onmessage = (ev) => {
            let pkg = SocketPackage.deserialize(ev.data.toString());
            if(!pkg.isReply())
                this.receive.bind(this)(pkg);
        };
    }

    public requestWebcamStream() : MediaStream{
        throw("stream not available");
    }

    private onConnection(){       
        this.AwaitReply(new SocketPackage('get_id')).then(
           (function(pkg : SocketPackage){
                this.ownID = pkg.data.id;
                this.onIDReceived(pkg.data.id);
            }.bind(this)),
            (function(){
                this.error("internal server error");
            }).bind(this)
        );
    }

    private async AwaitReply(original_pck : SocketPackage) : Promise<SocketPackage>{
        return new Promise((resolve, reject) => {
            let timeout = setTimeout((function(){
                this.server.removeEventListener('message', callback, false);
                reject("await reply timeout")
                return;
            }).bind(this), 2000);

           
           let callback = (function(message : MessageEvent){
               let reply_pkg  = SocketPackage.deserialize(message.data.toString());
               if(reply_pkg.replyFor == original_pck.id){
                    console.log(reply_pkg);
                    clearTimeout(timeout);
                    this.server.removeEventListener('message', callback, false);

                    if(reply_pkg.isErrorPackage())
                        reject(reply_pkg.data.message);
                    else
                        resolve(reply_pkg);
                    return;
                }
            }).bind(this);
           
            this.server.addEventListener('message', callback);
            this.server.send(original_pck.serialize());
            console.log(original_pck);
        })
    }

   
    public async call(peerID : number) : Promise<void>{
        return new Promise((resolve, reject)=>{
            if(peerID == this.ownID){
                reject('illegal peer id');
                return;
            }
            this.AwaitReply(new SocketPackage('call', {peerID : peerID})).then((function(pkg : SocketPackage){     
                resolve();
            }).bind(this), (error)=>{
                reject(error);
            });
    });
    }

    public changeTransmissionMode(mode : CallMode){
        this.AwaitReply(new SocketPackage('change_mode', {'mode' : mode})).then(()=>{
            console.log("changed");
        },
        (e)=>{
            this.error(e);
        });
        
    }

    private createPeer(peerID : number){
        let peer = new RTCPeerConnection({iceServers : this.iceServers});
        peer.onicecandidate = (ev) => this.onICECandidate.bind(this)(peerID, ev);
        peer.ontrack = (ev) => this.onStreamsReceived.bind(this)(peerID, ev.streams);
        peer.onnegotiationneeded = () => this.onNegotiationNeeded.bind(this)(peerID);
        this.onPeerConnected(peerID);
        return peer;
    }

    private startTransmission(peerID : number, mode : CallMode){
        if(this.peers[peerID] == null)
            this.peers[peerID] = this.createPeer(peerID);

        switch(mode){
            case CallMode.None:
                break;
            case CallMode.Video:
                let stream = this.requestWebcamStream();
                stream.getTracks().forEach(track => {
                    (<any>this.peers[peerID]).sender = this.peers[peerID].addTrack(track, stream);
                });
                break;
            default:
                throw("call mode not implemented");
        }
    }

    private stopTransmission(peerID : number, mode : CallMode){
        switch(mode){
            case CallMode.None:
                break;
            case CallMode.Video:
        if((<any>this.peers[peerID]).sender == null)
            throw("no track to stop");
        this.peers[peerID].removeTrack((<any>this.peers[peerID]).sender);
        break;
        }
    }

    private async onNegotiationNeeded(peerID : number){
        const peerOffer = await this.peers[peerID].createOffer();
        await this.peers[peerID].setLocalDescription(new RTCSessionDescription(peerOffer));
        
        this.AwaitReply(new SocketPackage('offer', {peerID: this.ownID, offer: peerOffer}, new AddressLabel(this.ownID, peerID))).then((async function(pkg : SocketPackage){
            console.log(pkg.data.answer);
            await this.peers[peerID].setRemoteDescription(new RTCSessionDescription(pkg.data.answer));
        }).bind(this));
    }
    
    private receive(pkg : SocketPackage){
        console.log(pkg);

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
            case 'start_transmission':
                this.startTransmission(pkg.data.peerID, pkg.data.mode);
                break;
            case 'stop_transmission':
                this.stopTransmission(pkg.data.peerID, pkg.data.mode);
                break;
            case 'disconnect':
                    this.peerDisconnected(pkg, pkg.data.peerID);
                break;
        }            
    }

    private peerDisconnected(pkg : SocketPackage, peerID : number){
        this.onPeerDisconnected(peerID);
    }

    private error(message : string){
        logger.error(message);
    }

    private onICECandidate(peerID : number, event : RTCPeerConnectionIceEvent){
        if (event.candidate !== null){
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

    public async sendData(){

    }
    
}
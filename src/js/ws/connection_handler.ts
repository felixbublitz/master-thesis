import { StatSet, StatTuple } from "../etc/stats";
import { AddressLabel, AdrSocket, CallMode, SocketPackage } from "./connection_types";

const BIT_TO_BYTE = 0.125;


export class ConnectionHandler{
    private server : WebSocket;
    private private_ownID : number;
    private readonly dataChannelID = 0;
    private readonly iceServers = [{urls: "stun:stun.stunprotocol.org"}];
    private readonly peers : Array<RTCPeerConnection> = [];

    onIDReceived(ownID : number){};
    onStreamsReceived(peerId : number, streams : readonly MediaStream[], peer : RTCPeerConnection, statsKey : string){};
    onStreamStopped(peerId : number){};
    onPeerConnected(peerId : number){};
    onPeerDisconnected(peerId : number){};
    onEvent(ev : string, data : any){};

    init(addr : string){
        this.server = new WebSocket(addr); 
        this.server.onopen = (ev)=>{this.onConnection()};
        this.server.onerror = (ev) => {console.log(ev)};
        this.server.onmessage = (ev) => {this.onMessage(ev)};
    }

    getPeers(){
        return this.peers;
    }

    get ownID() : number{
        return this.private_ownID;
    }

    private onConnection(){      
        console.info("Reached Server"); 
        
        this.AwaitReply(new SocketPackage('get_id')).then(
           ((pkg : SocketPackage) => {
                this.private_ownID = pkg.data.id;
                console.info("Peer connected as: " + this.private_ownID);
                this.onIDReceived(pkg.data.id);
            }),
            (() => {
                console.error("internal server error");
            })
        );
    }

    private onMessage(ev : MessageEvent){
        let pkg = SocketPackage.deserialize(ev.data.toString());
        
        if(pkg.isReply()){
            console.info("Received reply: " + pkg.event + (pkg.fwdAddr == null ? "" : " from peer " + pkg.fwdAddr.sender));
            return
        }

        console.info("Received event: " + pkg.event + (pkg.fwdAddr == null ? "" : " from peer " + pkg.fwdAddr.sender));
        switch(pkg.event){
            case 'offer':
                this.replyOffer(pkg);
                break;
            case 'remoteIceCandidate':
                this.onRemoteIceCandidate(pkg.data);
                break;
            case 'error':
                console.error(pkg.data.message);
                break;
            case 'disconnect':
                this.onPeerDisconnected(pkg.data.peerId);
                break;
            case 'establish_rtc':
                this.peers[pkg.data.peerId] = this.createRTCPeer(pkg.data.peerId);
                break;
            case 'stream_stopped':
                this.onStreamStopped(pkg.fwdAddr.sender);
                break;
            default:
                this.onEvent(pkg.event, pkg.data);
                break;         
        }
    }

    public send(pkg : SocketPackage){
        console.info("Send event: " + pkg.event + (pkg.fwdAddr == null ? "" : " to peer " + pkg.fwdAddr.receiver))
        this.server.send(pkg.serialize());
    }

    async AwaitReply(original_pck : SocketPackage) : Promise<SocketPackage>{
        return new Promise((resolve, reject) => {
            let timeout = setTimeout(() => {
                this.server.removeEventListener('message', callback, false);
                reject("await reply timeout")
                return;
            }, 2000);
           
           let callback = (message : MessageEvent) => {
               let reply_pkg  = SocketPackage.deserialize(message.data.toString());
               if(reply_pkg.replyFor == original_pck.id){
                    clearTimeout(timeout);
                    this.server.removeEventListener('message', callback, false);

                    if(reply_pkg.isErrorPackage()) reject(reply_pkg.data.message);
                    else resolve(reply_pkg);
                }
            };
           
            this.server.addEventListener('message', callback);
            this.send(original_pck);
        })
    }

    async getStats(peerId : number) : Promise<StatSet>{
        return new Promise(async (resolve, reject) => {

            if(this.peers[peerId] == null){
                reject('peer does not exist');
                return;
            }

            let stats = await this.peers[peerId].getStats();
            let set = new StatSet();
            let bitrate = 0;
            let rtt = 0;
            let bytesPerFrame = 0;
            
            stats.forEach(element => {
                if(bitrate == 0 && element.type == "candidate-pair" && element.nominated == true){
                    console.log(element);
                    bitrate = element.availableOutgoingBitrate;//element.availableIncomingBitrate; wieso nicht vorhanden???
                    rtt = element.currentRoundTripTime;
                }
                if(bytesPerFrame == 0 && element.type == 'inbound-rtp'){
                    console.log(element);
                    bytesPerFrame = element.bytesReceived/element.framesDecoded;
                }
               
            });

            if(bitrate != null && rtt != null && bytesPerFrame != null)
                set.add('transmissionTime', new StatTuple(rtt + bytesPerFrame/(bitrate*BIT_TO_BYTE), 1));

            console.log(set);
            resolve(set);

        })
    }
    
    removeRTCPeer(peerID : number){
        this.peers[peerID].close();
        this.peers[peerID] = null;
    }

    createRTCPeer(peerId : number){
        const peer = new RTCPeerConnection({iceServers : this.iceServers});
        peer.onicecandidate = (ev) => this.onICECandidate(peerId, ev);
        
        peer.ontrack = async (ev) => {
            let stats = await peer.getStats();
            let statsKey : string;
            stats.forEach(element => {
                if(statsKey == null && element.type == 'inbound-rtp'){
                    statsKey = element.id;
                }
            });;
            this.onStreamsReceived(peerId, ev.streams, peer, statsKey)
        };
        peer.onnegotiationneeded = () => this.onNegotiationNeeded(peerId);
        const channel = peer.createDataChannel('data', {negotiated: true, id: this.dataChannelID});
        channel.onmessage = (ev : MessageEvent) => {

        };
        console.log("RTC Connection to: " + peerId + " established");
        this.onPeerConnected(peerId);
        return peer;
    }

    private async onNegotiationNeeded(peerId : number){
        const peerOffer = await this.peers[peerId].createOffer();
        await this.peers[peerId].setLocalDescription(new RTCSessionDescription(peerOffer));
        
        this.AwaitReply(new SocketPackage('offer', {peerId: this.ownID, offer: peerOffer}, new AddressLabel(this.ownID, peerId))).then(async (pkg : SocketPackage) => {
            await this.peers[peerId].setRemoteDescription(new RTCSessionDescription(pkg.data.answer));
        });
    }

    private onICECandidate(peerId : number, event : RTCPeerConnectionIceEvent){
        if (event.candidate != null){
            
            this.send(new SocketPackage('remoteIceCandidate', {peerId : this.ownID, candidate : event.candidate}, new AddressLabel(this.ownID, peerId)));
        }
    }

    private async onRemoteIceCandidate(data : any){
        try {
            if(this.peers[data.peerId].remoteDescription != null)
            await this.peers[data.peerId].addIceCandidate(data.candidate);
          } catch (error) {
            console.error(error);
          }
    }

    private async replyOffer(pkg : any){
        if(this.peers[pkg.data.peerId] == null) this.peers[pkg.data.peerId] = this.createRTCPeer(pkg.data.peerId);

        await this.peers[pkg.data.peerId].setRemoteDescription(new RTCSessionDescription(pkg.data.offer));
        const peerAnswer = await this.peers[pkg.data.peerId].createAnswer();
        await this.peers[pkg.data.peerId].setLocalDescription(new RTCSessionDescription(peerAnswer));

        this.send(pkg.reply({answer: peerAnswer}));
    }

    addStream(peerId : number, stream : MediaStream){
        for(const track of stream.getTracks()){
            (this.peers[peerId] as any).sender = this.peers[peerId].addTrack(track, stream);
        }
    }

    removeStream(peerId : number){
        if((this.peers[peerId] as any).sender == null) throw(new Error("no track to stop"));
        this.peers[peerId].removeTrack((<any>this.peers[peerId]).sender);
    }
}
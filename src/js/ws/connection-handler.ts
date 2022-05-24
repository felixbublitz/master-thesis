import { AddressLabel, AdrSocket, SocketPackage } from "./connection-types";

const logging = require('webpack/lib/logging/runtime');
let logger = logging.getLogger("connection-handler");


export class ConnectionHandler{
    private server : WebSocket;
    private peer : RTCPeerConnection;
    private ownID : number;
    private receiverID : number = 0;
    private iceSetupDone = false;

    public onConnection(){}
    public onStreamsReceived(streams : readonly MediaStream[]){}

    public init(addr : string, receiver : number){
        this.receiverID = receiver;
        this.server = new WebSocket(addr); 
        this.server.onopen = this.open.bind(this);
        this.server.onerror = this.error.bind(this);
        this.server.onmessage = this.receive.bind(this);
        this.peer = new RTCPeerConnection({
            iceServers : [
                {
                    urls: "stun:stun.stunprotocol.org"
                }
            ]
        });
        this.peer.onicecandidate = this.onICECandidate.bind(this);
        this.peer.addEventListener('track', (event) => {
            this.onStreamsReceived(event.streams);
        })
    }

    private open(){
        logger.info("Connected to server");
        this.server.send(new SocketPackage('register').serialize());
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
            case 'mediaOffer':
                this.mediaOffer(pkg.data);
                break;
            case 'mediaAnswer':
                this.mediaAnswer(pkg.data);
                break;
            case 'iceCandidate':
                this.iceCandidate(pkg.data);
                break;
            case 'error':
                this.error(pkg.data.message);
                break;
        }            
    }

    private error(message : string){
        logger.error(message);
    }

    private onICECandidate(event : RTCPeerConnectionIceEvent){
        if (!this.iceSetupDone && event.candidate !== null){
            this.iceSetupDone = true;
            this.server.send(new SocketPackage('iceCandidate', {candidate : event.candidate}, new AddressLabel(this.ownID, this.receiverID)).serialize());
        }
    }

    public async sendMediaOffer(){
        const peerOffer = await this.peer.createOffer();
        await this.peer.setLocalDescription(new RTCSessionDescription(peerOffer));
        this.server.send(new SocketPackage('mediaOffer', {offer: peerOffer}, new AddressLabel(this.ownID, this.receiverID)).serialize());
    }

    private async mediaAnswer(data : any){
        await this.peer.setRemoteDescription(new RTCSessionDescription(data.answer));
    }

    private async mediaOffer(data : any){
        await this.peer.setRemoteDescription(new RTCSessionDescription(data.offer));
        const peerAnswer = await this.peer.createAnswer();
        await this.peer.setLocalDescription(new RTCSessionDescription(peerAnswer));
        this.server.send(new SocketPackage('mediaAnswer', {answer: peerAnswer}, new AddressLabel(this.ownID, this.receiverID)).serialize());
    }

    private async iceCandidate(data : any){
        try {
            await this.peer.addIceCandidate(data.candidate);
          } catch (error) {
            this.error(error);
          }
    }

    public sendVideo(stream : MediaStream){
        stream.getTracks().forEach(track => {
            this.peer.addTrack(track, stream);
        });

        this.sendMediaOffer();
    }
    
}
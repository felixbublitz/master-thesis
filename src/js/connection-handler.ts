import { ForwardPackage, AdrSocket, SocketPackage } from "./connection-types";

export class ConnectionHandler{
    private server : WebSocket;
    private peer : RTCPeerConnection;
    private ownID : number;
    private receiver : number = 0;

    constructor(){

    }

    public init(addr : string = null, ownID? : number){
    
        this.ownID = ownID;
        
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
        let pck  = SocketPackage.decode(message.data.toString());
        logger.info("Received event: " + pck.event);

        switch(pck.event){
            case 'register-re':
                this.ownID = pck.data.id;
                logger.log("Registered as peer: " + this.ownID);
                this.onConnection(this);
            break;
            case 'mediaOffer':
                this.mediaOffer(pck.data);
                return;
            case 'mediaAnswer':
                this.mediaAnswer(pck.data);
            case 'iceCandidate':
                this.iceCandidate(pck.data);
            case 'error':
                this.error(pck.data.message);
        }            
    }

    private error(message : string){
        logger.error(message);
    }

    private onICECandidate(event : RTCPeerConnectionIceEvent){
        if (event.candidate !== null) 
        this.server.send(new ForwardPackage(this.receiver, 'iceCandidate', {candidate : event.candidate}).serialize());
    }

    public onConnection(ch : ConnectionHandler){}
    public onStreamsReceived(streams : readonly MediaStream[]){}

    public async sendMediaOffer(){
        const peerOffer = await this.peer.createOffer();
        await this.peer.setLocalDescription(new RTCSessionDescription(peerOffer));
        this.server.send(new ForwardPackage(this.receiver, 'mediaOffer', {offer: peerOffer}).serialize());
    }

    private async mediaAnswer(data : any){
        await this.peer.setRemoteDescription(new RTCSessionDescription(data.answer));
    }

    private async mediaOffer(data : any){
        await this.peer.setRemoteDescription(new RTCSessionDescription(data.offer));
        const peerAnswer = await this.peer.createAnswer();
        await this.peer.setLocalDescription(new RTCSessionDescription(peerAnswer));
        this.server.send(new ForwardPackage(this.receiver, 'mediaAnswer', {answer: peerAnswer,}).serialize());
        
    }

    private async iceCandidate(data : any){
        try {
            const candidate = new RTCIceCandidate(data.candidate);
            await this.peer.addIceCandidate(candidate);
          } catch (error) {
            this.error(error);
          }
    }

    public sendVideo(stream : MediaStream){
        logger.log("Send Video");
        stream.getTracks().forEach(track => {
            this.peer.addTrack(track, stream);
        });

        this.sendMediaOffer();

    }
    
}

const logging = require('webpack/lib/logging/runtime');


logging.configureDefaultLogger({
    level: 'debug',
    debug: '/connection-handler/',
  });

let logger = logging.getLogger("connection-handler");

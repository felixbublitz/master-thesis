import { PerSecondItem, SequenceLogger, StringItem, TimeMeasuringItem, ValueMeasuringItem } from "../logging/sequence_logger";
import { AddressLabel, SocketPackage } from "./connection_types";
import { RTCChannel } from "./rtc_channel";


enum RtcEncoding{
    Binary,
    String
}

const BIT_TO_BYTE = 0.125;
const BYTE_TO_BIT = 8;
const S_TO_MS = 1000;

const RTC_DATA_ENCODING : RtcEncoding = RtcEncoding.String;

export class ConnectionHandler{
    private server : WebSocket;
    private private_ownID : number;
    private readonly dataChannelID = 0;
    private readonly iceServers = [{urls: "stun:stun.stunprotocol.org"}];
    private readonly peers : Array<RTCPeerConnection> = [];
    private sequenceLogger : Array<SequenceLogger> = [];

    onIDReceived(ownID : number){};
    onStreamsReceived(peerId : number, streams : readonly MediaStream[], peer : RTCPeerConnection, statsKey : string){};
    onPeerConnected(peerId : number){};
    onPeerDisconnected(peerId : number){};
    onEvent(ev : string, data : any){};

    constructor(){
       
    }

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
                console. info("Peer connected as: " + this.private_ownID);
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
                this.send(new SocketPackage('rtc_established'))
                break;
            default:

            if(pkg.event == "start_transmission"){
                (this.peers[pkg.data.peerId] as any).changeNetLogging('start-send-data');
            }

            if(pkg.event == "start_reception"){
                (this.peers[pkg.data.peerId] as any).changeNetLogging('start-rec-data');
            }
            
            if(pkg.event == "stop_reception"){
                (this.peers[pkg.data.peerId] as any).changeNetLogging('stop-rec-data');
            }

            if(pkg.event == "stop_transmission"){
                (this.peers[pkg.data.peerId] as any).changeNetLogging('stop-send-data');
            }
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


    async getPerformanceSample(peerId : number) : Promise<SequenceLogger.Sample>{
        if(this.sequenceLogger[peerId] == null)
            throw("peer does not exist");
        return await this.sequenceLogger[peerId].sample();
    }
    
    removeRTCPeer(peerId : number){
        this.peers[peerId].close();
        this.peers[peerId] = null;
    }

    createRTCPeer(peerId : number){
        const peer = new RTCPeerConnection({iceServers : this.iceServers});

        (peer as any).recLog = false;
        (peer as any).sendLog = false;


        (peer as any).changeNetLogging = (param : string)=>{
            if(param == "start-rec-video"){
                this.sequenceLogger[peerId].add('frame_size', new TimeMeasuringItem(0, 'b'));
                this.sequenceLogger[peerId].add('framerate', new PerSecondItem(0, 'fps'));
                this.sequenceLogger[peerId].add('decode_time', new TimeMeasuringItem(2, 'ms'));
                this.sequenceLogger[peerId].add('codec', new StringItem());
            }

            if(param == "stop-rec-video"){
                this.sequenceLogger[peerId].remove('frame_size');
                this.sequenceLogger[peerId].remove('framerate');
                this.sequenceLogger[peerId].remove('decode_time');
                this.sequenceLogger[peerId].remove('codec');
            }

            if(param == "start-send-data"){
                this.sequenceLogger[peerId].add('roundtrip_time', new TimeMeasuringItem(2, 'ms'));
                this.sequenceLogger[peerId].add('bitrate', new PerSecondItem(0, 'b/s'));
                (peer as any).sendLog = true;
            }

            if(param == "stop-send-data"){
                this.sequenceLogger[peerId].remove('bitrate');
                (peer as any).sendLog = false;
            }

            if(param == "start-rec-data"){
                this.sequenceLogger[peerId].add('roundtrip_time', new TimeMeasuringItem(2, 'ms'));
                this.sequenceLogger[peerId].add('bitrate', new PerSecondItem(0, 'b/s'));
                (peer as any).recLog = true;
            }

            if(param == "stop-rec-data"){
                (peer as any).recLog = false;
                this.sequenceLogger[peerId].remove('bitrate');
            }

            if(param == "start-send-video"){
                this.sequenceLogger[peerId].add('encode_time', new TimeMeasuringItem(2, 'ms'));
            }

            if(param == "stop-send-video"){
                this.sequenceLogger[peerId].remove('encode_time');
            }

            if(!(peer as any).recLog && ! (peer as any).sendLog){
                this.sequenceLogger[peerId].remove('roundtrip_time');
            }

        }

        peer.onicecandidate = (ev) => this.onICECandidate(peerId, ev);
        
       


        peer.ontrack = async (ev) => {
            let stats = await peer.getStats();
            let statsKey : string;
            stats.forEach(element => {
                if(statsKey == null && element.type == 'inbound-rtp'){
                    statsKey = element.id;
                }
            });
            (this.peers[peerId] as any).changeNetLogging('start-rec-video');


            ev.streams[0].onremovetrack = ()=>{
                (this.peers[peerId] as any).changeNetLogging('stop-rec-video');
            }
       
            this.onStreamsReceived(peerId, ev.streams, peer, statsKey)
        };
        peer.onnegotiationneeded = () => this.onNegotiationNeeded(peerId);

        let rtcChannel = new RTCChannel(peer, peerId);

        rtcChannel.onData = (peerId, dataIdentifier, data)=>{
            if(dataIdentifier == RTCChannel.DataType.FrameData)
                this.onEvent('render_update', {peerId : peerId, content: data});

        }

        (peer as any).rtcChannel = rtcChannel;

        console.log("RTC Connection to: " + peerId + " established");
        this.onPeerConnected(peerId);

        
        this.sequenceLogger[peerId] = new SequenceLogger();


        this.sequenceLogger[peerId].beforeSample = async()=>{
            await (async ()=>{
                if(!(peer as any).recLog && !(peer as any).sendLog)
                return;
                const stats = await peer.getStats();
                let senderTrack = "";
                let receiverTrack = "";


                for(const [key, element] of stats){
                    if(element.type == 'stream'){
                        if(element.trackIds.length >0){
                            const track : string = element.trackIds[element.trackIds.length-1];
                            if(track.includes("sender"))senderTrack = element.trackIds[element.trackIds.length-1];
                            if(track.includes("receiver"))receiverTrack = element.trackIds[element.trackIds.length-1];
                        }
                    }
                }


                for(const [key, element] of stats){
                    if(element.type == "candidate-pair" && element.nominated == true){
                        (this.sequenceLogger[peerId].get('roundtrip_time') as TimeMeasuringItem).add(element.currentRoundTripTime * S_TO_MS, 1);
                    }
                    if(element.type == 'outbound-rtp' && element.trackId == senderTrack){
                        (this.sequenceLogger[peerId].get('encode_time') as TimeMeasuringItem).addContinuous(element.totalEncodeTime * S_TO_MS, element.framesEncoded);;
                    }

    
                    if(element.type == 'inbound-rtp' && element.trackId == receiverTrack){
                        (this.sequenceLogger[peerId].get('codec') as StringItem).set(stats.get(element.codecId).mimeType);
                        (this.sequenceLogger[peerId].get('frame_size') as TimeMeasuringItem).addContinuous(element.bytesReceived+element.headerBytesReceived, element.framesReceived);
                        (this.sequenceLogger[peerId].get('decode_time') as TimeMeasuringItem).addContinuous(element.totalDecodeTime * S_TO_MS, element.framesDecoded);
                        (this.sequenceLogger[peerId].get('bitrate') as PerSecondItem).addContinuous((element.bytesReceived+element.headerBytesReceived) * BYTE_TO_BIT);
                        (this.sequenceLogger[peerId].get('framerate') as PerSecondItem).addContinuous(element.framesDecoded);
                    }

                    if(element.type == 'data-channel'){
                        if(element.bytesSent != null) (this.sequenceLogger[peerId].get('bitrate') as PerSecondItem).addContinuous((element.bytesSent) * BYTE_TO_BIT);
                        if(element.bytesReceived != null)(this.sequenceLogger[peerId].get('bitrate') as PerSecondItem).addContinuous((element.bytesReceived) * BYTE_TO_BIT);
                    }
                };

            })();
            
           
        }
        this.sequenceLogger[peerId].sample();



        return peer;
    }



    public sendRTCData(peerId : number, identifier : number, data : Int8Array){
        ((this.peers[peerId] as any).rtcChannel as RTCChannel).send(identifier, data);
    }

    private async onNegotiationNeeded(peerId : number){
        const peerOffer = await this.peers[peerId].createOffer();
        await this.peers[peerId].setLocalDescription(new RTCSessionDescription(peerOffer));
        
        this.AwaitReply(new SocketPackage('offer', {peerId: this.ownID, offer: peerOffer}, new AddressLabel(this.ownID, peerId))).then(async (pkg : SocketPackage) => {
            await this.peers[peerId].setRemoteDescription(new RTCSessionDescription(pkg.data.answer));

            const senders = this.peers[peerId].getSenders()[0];
            if(senders != null){
        const params = senders.getParameters();
        params.encodings[0].maxBitrate = 100000000
        senders.setParameters(params); //1mbps*/
        }
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
        (this.peers[peerId] as any).changeNetLogging('start-send-video');
        for(const track of stream.getTracks()){
            track.applyConstraints({frameRate : {max: 200}});
            (this.peers[peerId] as any).sender = this.peers[peerId].addTrack(track, stream);
        }
    }

    removeStream(peerId : number){
        (this.peers[peerId] as any).changeNetLogging('stop-send-video');
        if((this.peers[peerId] as any).sender == null) throw(new Error("no track to stop"));
        this.peers[peerId].removeTrack((<any>this.peers[peerId]).sender);
    }
}



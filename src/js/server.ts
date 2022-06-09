import {WebSocket as WSWebSocket, WebSocketServer, MessageEvent} from "ws";
import {SocketPackage} from "./ws/connection_types";
import { CallPeer, CallSession } from "./ws/server_types";

const express = require('express');
const logging = require('webpack/lib/logging/runtime');

class Server{
    private readonly httpPort = 80;
    private readonly wsPort = 2222;
    private readonly app = express();
    private readonly server : WebSocketServer;
    private readonly peers : Array<CallPeer>

    constructor(){
        this.app.use(express.static(__dirname + '/app'));
        this.app.use('/app', express.static(__dirname + '/app'));
        this.app.use('/library', express.static(__dirname + '/library'));
     
        this.app.listen(this.httpPort, () => {})

        this.server = new WebSocketServer({ port : this.wsPort });
        this.server.on('connection', (socket) => {this.onConnection(socket)});
        this.peers = new Array<CallPeer>();
    }
    
    private onConnection(socket : WSWebSocket){
        let peer = new CallPeer(socket);
        this.peers.push(peer);

        console.info('Peer connected as: ' + peer.id);
        
        socket.on('message', (message)=>{
            let reply = this.onPackage(SocketPackage.deserialize(message.toString()), peer);
            if(reply != null) peer.send(reply);
        });  

        socket.on('close', ()=>{
            this.onClose(peer);
        });  
    }

    private onClose(peer : CallPeer){
        peer.destroy();
        this.peers.splice(this.peers.indexOf(peer), 1);
    }

    private onPackage(pkg : SocketPackage, peer : CallPeer) : SocketPackage{
        console.info("Received event: " + pkg.event + " from peer " + peer.id);

        if(pkg.fwdAddr != null){
            this.forwardPackage(pkg);
            return;
        }

        switch(pkg.event){
            case 'get_id':
                return pkg.reply({id : peer.id});

            case 'call':
                let remote = this.getPeer(pkg.data.peerId);
                if(remote == null){
                    return pkg.replyError("peer does not exist");
                }
                
                if(remote == peer) return pkg.replyError("peer id is own id");

                try{
                    this.joinCall(peer, remote);
                }catch(e){
                    return pkg.replyError(e);
                }
                break;

            case 'peer_exists':
                return pkg.reply({'exists' : this.getPeer(pkg.data.peerId) == null ? false : true});

            case 'change_mode':
                if(peer.callSession == null) return pkg.replyError("you have to be in a call to change the mode");
                peer.changeMode(pkg.data.mode);
                break;

            case 'rtc_established':
                if(peer.callSession == null) return pkg.replyError("you have to be in a call to change the mode");
                peer.connectionEstablished();
            break;

            default:

        }

        return pkg.replyOK();
    }

    private joinCall(caller : CallPeer, callee : CallPeer){
        if(caller.callSession == null && callee.callSession == null){
            let session = new CallSession();
            session.join(caller);
            session.join(callee);
            return;
        }

        if(caller.callSession == callee.callSession) throw(new Error("Peers already connected"));

        if(caller.callSession != null && callee.callSession != null) throw(new Error("Peers are in seperate calls"));

        let unconnectedPeer = caller.callSession == null ? caller : callee;
        let connectedPeer = caller.callSession != null ? caller : callee;

        let session = connectedPeer.callSession;
        session.join(unconnectedPeer);
        
    }

    private forwardPackage(pkg : SocketPackage){
        let receiver = this.getPeer(pkg.fwdAddr.receiver);
        if(receiver == null) throw(new Error('Socket ' + pkg.fwdAddr.receiver + " not exists!"));
        else receiver.send(pkg);
    }

    private getPeer(id : number) : CallPeer{
        for(const peer of this.peers){
            if(peer.id === id) return peer;
        }
        return null;
    }
}

new Server();
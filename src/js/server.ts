import {WebSocket as WSWebSocket, WebSocketServer, MessageEvent} from "ws";
import {SocketPackage} from "./ws/connection-types";
import { CallPeer, CallSession } from "./ws/server-types";

const express = require('express');
const logging = require('webpack/lib/logging/runtime');

logging.configureDefaultLogger({
    level: 'debug',
    debug: true,
  });

let logger = logging.getLogger("Server");


class Server{
    private readonly httpPort : number = 80;
    private readonly wsPort : number = 2222;
    private app = express();
    private server : WebSocketServer;
    private readonly peers : Array<CallPeer>

    constructor(){
        this.app.use(express.static(__dirname + '/app'));
        this.app.use('/app', express.static(__dirname + '/app'));
        this.app.use('/library', express.static(__dirname + '/library'));
     
        this.app.listen(this.httpPort, () => {
            logger.log('App listening on port ${this.port}')
        })

        this.server = new WebSocketServer({ port : this.wsPort });
        this.server.on('connection', this.connection.bind(this));
        this.peers = new Array<CallPeer>();
    }
    
    private connection(socket : WSWebSocket){
        logger.info("Peer connected");
        let peer = new CallPeer(socket);
        this.peers.push(peer);
        
        socket.on('message', (message : MessageEvent)=>{
            console.log(message.toString());
            let reply = this.onPackage(SocketPackage.deserialize(message.toString()), peer);
            if(reply != null)
                peer.send(reply);
            
        });  
        socket.on('close', ()=>{
            this.close(peer);
        });  
        
    }

    private close(peer : CallPeer){
        peer.destroy();
        this.peers.splice(this.peers.indexOf(peer), 1);
        console.log(this.peers);
    }

    private onPackage(pkg : SocketPackage, peer : CallPeer) : SocketPackage{
        logger.info("Received event: " + pkg.event + " from " + peer.id + " [" + pkg.id + "]");

        if(pkg.fwdAddr != null){
            this.forwardPackage(pkg);
            return;
        }

        switch(pkg.event){
            case 'get_id':
                logger.info('Socket ' + peer.id + " connected");
                return pkg.reply({id : peer.id});

            case 'call':
                let remote = this.getPeer(pkg.data.peerID);
                if(remote == null){
                    return pkg.replyError("peer does not exist");
                }
                
                if(remote == peer){
                    return pkg.replyError("peer id is own id");
                }
                try{
                    this.joinCall(peer, remote);
                }catch(e){
                    return pkg.replyError(e);
                }
                break;

            case 'peer_exists':
                return pkg.reply({'exists' : this.getPeer(pkg.data.peerID) == null ? false : true});
            case 'change_mode':
                if(peer.callSession == null)
                    return pkg.replyError("you have to be in a call to change the mode");
                peer.changeMode(pkg.data.mode);
                break;
        }

        return pkg.replyOK();
    }

    private joinCall(caller : CallPeer, callee : CallPeer){

        if(caller.callSession == null && callee.callSession == null){
            let session = new CallSession();
            session.join(caller);
            session.join(callee);

            //session.on('settingschanged', this.CallSessionSettingsChanged);
            logger.info("Connected peers");
            logger.info(session);
            return;
        }

        if(caller.callSession == callee.callSession)
            throw("Peers already connected");

        if(caller.callSession != null && callee.callSession != null)
            throw("Peers are in seperate calls");

        let unconnectedPeer = caller.callSession == null ? caller : callee;
        let connectedPeer = caller.callSession != null ? caller : callee;

        let session = connectedPeer.callSession;
        session.join(unconnectedPeer);
        
    }

    private forwardPackage(pkg : SocketPackage){
        logger.info("Forward event: " + pkg.event + " to: " + pkg.fwdAddr.receiver);
        let receiver = this.getPeer(pkg.fwdAddr.receiver);
        if(receiver === null){
            logger.error('Socket ' + pkg.fwdAddr.receiver + " not exists!");
            return;
        }

        this.getPeer(pkg.fwdAddr.receiver).send(pkg);
    }

    private getPeer(id : number) : CallPeer{
        let out = null;
        this.peers.forEach((peer : CallPeer)=>{
            if(peer.id === id){
                out = peer;
            }
        });

        return out;
    }
}

new Server();
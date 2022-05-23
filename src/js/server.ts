
import {WebSocket as WSWebSocket, WebSocketServer} from "ws";

class Server{
    
    readonly port = 80;
    app = express();
    server;
    static initClients : number = 0;


    constructor(){
        this.app.use(express.static('./'));
        this.app.use('/sender', express.static(__dirname + '/sender'));
        this.app.use('/receiver', express.static(__dirname + '/receiver'));
        this.app.use('/library', express.static(__dirname + '/library'));
     
        this.app.listen(this.port, () => {
            logger.log(`App listening on port ${this.port}`)
        })


       

        this.server = new WebSocketServer({ port : 2222 });
        this.server.on('connection', this.connection.bind(this));
    }
    
   
    
    private connection(peer : WSWebSocket){
        logger.info("new peer connection");
        peer.on('message', (message : any)=>{
            this.receive(message.toString(), <any>peer);
        });  
    }

    private receive(message : string, peer : AdrSocket){
        let pck  = SocketPackage.decode(message.toString());
        logger.info("Received event: " + pck.event + " from " + peer.id);

        if(pck.forward){
            this.forwardPackage(<ForwardPackage>pck, peer.id);
            return;
        }

        switch(pck.event){
            case 'register':
                peer.id = Server.initClients++;
                peer.send(new SocketPackage('register-re', {id : peer.id}).serialize());
                logger.info('Socket ' + peer.id + " connected");
                break;
            case 'connect':
                //data.peer;
            break;
        }
    }

    private forwardPackage(pck : ForwardPackage, sender : number){
        if(sender == null || pck.address.receiver == null){
            logger.error("sender or receiver not set")
            logger.group("sender or receiver not set");
            logger.debug(pck);
            logger.groupEnd();
            return;
        }

        logger.info("Forward event: " + pck.event + " to: " + pck.address.receiver);

        pck.address.sender = sender;
        logger.info('Socket ' + sender + " sends event: " + pck.event);
        this.getSocket(pck.address.receiver).send(pck.serialize());
    }


    
    private getSocket(id : number) : AdrSocket{

        let out = null;

        this.server.clients.forEach((item : WSWebSocket)=>{
            
            let client : AdrSocket = <any>item;

            if(client.id == id){
                out = client;
            }
        });

        if(out == null)
        logger.error('Socket ' + id + " not found!");

        return out;
    }
      
  

}

const express = require('express');
const logging = require('webpack/lib/logging/runtime');

logging.configureDefaultLogger({
    level: 'info',
    debug: '/Server/',
  });

import {ForwardPackage, SocketPackage, AdrSocket, AddressLabel} from "./connection-types";
let logger = logging.getLogger("Server");
new Server();
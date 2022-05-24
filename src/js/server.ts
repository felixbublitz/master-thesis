
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
        logger.info("Peer connected");
        peer.on('message', (message : any)=>{
            this.receive(message.toString(), <any>peer);
        });  
    }

    private receive(message : string, peer : AdrSocket){
        let pkg = SocketPackage.deserialize(message.toString());

        logger.info("Received event: " + pkg.event + " from " + peer.id);

        if(pkg.fwdAddr != null){
            this.forwardPackage(pkg);
            return;
        }

        switch(pkg.event){
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

    private forwardPackage(pkg : SocketPackage){
        if(pkg.fwdAddr == null){
            logger.error("fwdAddr not set")
            logger.debug(pkg);
            logger.groupEnd();
            return;
        }

        logger.debug(pkg.fwdAddr);

        logger.info("Forward event: " + pkg.event + " to: " + pkg.fwdAddr.receiver);
        this.getSocket(pkg.fwdAddr.receiver).send(pkg.serialize());
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
    level: 'debug',
    debug: true,
  });

import {SocketPackage, AdrSocket, AddressLabel} from "./connection-types";
let logger = logging.getLogger("Server");
new Server();
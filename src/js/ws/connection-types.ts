const logging = require('webpack/lib/logging/runtime');
let logger = logging.getLogger("connection-handler");

export interface AdrSocket extends WebSocket{
    id : number;
}

export class AddressLabel{
    private readonly NOT_SET = -1;
    public readonly sender : number = this.NOT_SET;
    public readonly receiver : number = this.NOT_SET;

    constructor(sender : number, receiver : number){
        this.sender = sender;
        this.receiver = receiver;
    }
    
    public getData(){
        return {sender : this.sender, receiver : this.receiver};
    }
}


export class SocketPackage{
    readonly event: string;
    readonly data: any;
    readonly fwdAddr : AddressLabel;
    readonly id : string;

    constructor(event: string, data?: any, fwdAddr? : AddressLabel, id? : string) {
        this.event = event;
        this.id = id == null ? ""+Date.now() : id;

        if(data !== null)
            this.data = data;

        if(fwdAddr !== null)
            this.fwdAddr = fwdAddr;
    }
    
    static deserialize(encrypted: string) : SocketPackage {        
        let object = JSON.parse(encrypted);
        logger.group("Deserialize socket package");
        logger.debug(object);
        logger.groupEnd();
        return new SocketPackage(object.event, object.data, object.fwdAddr == null ? null : new AddressLabel(object.fwdAddr.sender, object.fwdAddr.receiver), object.id);
    }

    public reply(data : any) : SocketPackage {
        let addr = null;

        if(this.fwdAddr != null)
            addr = new AddressLabel(this.fwdAddr.receiver, this.fwdAddr.sender);

        let reply = new SocketPackage(this.event + "_re", data, addr, this.id + "_re");
        return reply;
    }

    public replyError(message : String) : SocketPackage {
        let addr = null;

        if(this.fwdAddr != null)
            addr = new AddressLabel(this.fwdAddr.receiver, this.fwdAddr.sender);

        let reply = new SocketPackage("error_re", {message : message}, addr, this.id + "_re");
        return reply;
    }

    serialize() {
        let object : any = {};
        object.event = this.event;

        object.id = this.id;

        if(this.fwdAddr != null)
        object.fwdAddr = this.fwdAddr.getData();

        if(this.data != null)
        object.data = this.data;

        logger.group("Serialize socket package");
        logger.debug(object);
        logger.groupEnd();

        return JSON.stringify(object);
    }
}

export class ErrorPackage extends SocketPackage{
    
    public constructor (e : string){
        super('error', {'message' : e});
    }

}
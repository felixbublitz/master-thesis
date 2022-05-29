const logging = require('webpack/lib/logging/runtime');
let logger = logging.getLogger("connection-handler");

export enum CallMode{
    None = 0,
    Video = 1,
    Wireframe = 2,
    Reconstruct = 3
}


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
    readonly replyFor : string = null;

    constructor(event: string, data?: any, fwdAddr? : AddressLabel, id? : string, replyFor? : string) {
        this.event = event;
        this.id = id == null ? ""+Date.now() : id;

        if(data !== null)
            this.data = data;

        if(replyFor != null)
            this.replyFor = replyFor;

        if(fwdAddr !== null)
            this.fwdAddr = fwdAddr;
    }
    
    static deserialize(encrypted: string) : SocketPackage {        
        let object = JSON.parse(encrypted);
        return new SocketPackage(object.event, object.data, object.fwdAddr == null ? null : new AddressLabel(object.fwdAddr.sender, object.fwdAddr.receiver), object.id, object.replyFor);
    }

    public isReply(){
        return this.replyFor == null ? false : true;
    }

    public reply(data : any) : SocketPackage {
        let addr = null;

        if(this.fwdAddr != null)
            addr = new AddressLabel(this.fwdAddr.receiver, this.fwdAddr.sender);

        let reply = new SocketPackage(this.event , data, addr, null, this.id);
        return reply;
    }

    public isErrorPackage() : boolean{
        if(this.event == "error" || this.event == "error_re")
        return true;

        return false;
    }

    public replyError(message : String) : SocketPackage {
        let addr = null;

        if(this.fwdAddr != null)
            addr = new AddressLabel(this.fwdAddr.receiver, this.fwdAddr.sender);

        let reply = new SocketPackage("error", {message : message}, addr, null, this.id);
        return reply;
    }

    public replyOK(){
        let addr = null;

        if(this.fwdAddr != null)
            addr = new AddressLabel(this.fwdAddr.receiver, this.fwdAddr.sender);

        let reply = new SocketPackage("ok", null, addr, this.id, this.id);
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

        if(this.replyFor != null)
        object.replyFor = this.replyFor;

        return JSON.stringify(object);
    }
}



export class ErrorPackage extends SocketPackage{
    
    public constructor (e : string){
        super('error', {'message' : e});
    }

}
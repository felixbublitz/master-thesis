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
    event: string;
    data: any;
    fwdAddr : AddressLabel;

    constructor(event: string, data?: any, fwdAddr? : AddressLabel) {
        this.event = event;

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
        return new SocketPackage(object.event, object.data, object.fwdAddr == null ? null : new AddressLabel(object.fwdAddr.sender, object.fwdAddr.receiver));
    }

    serialize() {
        let object : any = {};
        object.event = this.event;

        if(this.fwdAddr !== null)
        object.fwdAddr = this.fwdAddr.getData();

        if(this.data !== null)
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
const logging = require('webpack/lib/logging/runtime');
let logger = logging.getLogger("Server");


export interface AdrSocket extends WebSocket{
    id : number;
}

export class AddressLabel{
    private NOT_SET = -1;
    public sender : number = this.NOT_SET;
    public receiver : number = this.NOT_SET;

    
    public getData(){
        return {sender : this.sender, receiver : this.receiver};
    }

}

export class SocketPackage{
    readonly event : string;
    readonly data : any;
    readonly forward : boolean = false;

    constructor(event : string, data? : object){
        logger.group("Create Socket Package: " + event);
        logger.debug(data);
        logger.groupEnd();
        this.event = event;
        this.data = data;
    }

    

    static decode(encrypted : string){
        let object = JSON.parse(encrypted);

        if(object.forward)
            return new ForwardPackage(object.address, object.event, object.data);

        return new SocketPackage(object.event, object.data);
    }



    public serialize(){
        let object : any = {};
        object.event = this.event;
        object.data = this.data;
        return JSON.stringify(object);
    }

}





export class ForwardPackage extends SocketPackage{

    public address : AddressLabel;
    forward = true;

    constructor(address : number | AddressLabel, event : string, data : object){
        super(event, data)
        this.address = new AddressLabel();

        if(typeof address === 'number'){
            this.address.receiver = <number>address;
        }else{
            this.address = <AddressLabel>address;
        }
        
    }

    static deserialize(encrypted : string){
        logger.group("Deserialize socket package");
        logger.debug(this);
        logger.groupEnd();

        let object = JSON.parse(encrypted);
        return new ForwardPackage(object.event, object.address, object.data);
    }

    public serialize(){
        
        logger.group("Serialize socket package");
        logger.debug(this);
        logger.groupEnd();

        let object : any = {};
        object.event = this.event;
        object.address = this.address.getData();
        object.data = this.data;
        object.forward = this.forward;

        return JSON.stringify(object);
    }

  

}

export class ErrorPackage extends SocketPackage{
    
    public constructor (e : string){
        super('error', {'message' : e});
    }

}

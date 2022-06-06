import { Namespace } from "socket.io";

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
    readonly sender : number = this.NOT_SET;
    readonly receiver : number = this.NOT_SET;

    constructor(sender : number, receiver : number){
        this.sender = sender;
        this.receiver = receiver;
    }
    
    getData(){
        return {sender : this.sender, receiver : this.receiver};
    }
}

export class RTCPackage{
    readonly type: RTCPackage.Type;
    readonly data: RTCPackage.Data;
    readonly fwdAddr : AddressLabel;

    constructor(type : RTCPackage.Type, data : RTCPackage.Data){
        this.type = type;
        this.data = data;
    }

    encodeBinary(){
        let dataBinary = this.data.encodeBinary();
        let headerBinary = new Uint8Array([this.type]);
        let out = new Uint8Array(headerBinary.length + dataBinary.length);
        out.set(headerBinary);
        out.set(dataBinary, headerBinary.length);
        return out;
    }

    encodeString() : String{
        let obj  : any = {};
        obj.type = this.type;
        obj.data = this.data;
        obj.fwdAddr = this.fwdAddr;
        return JSON.stringify(obj);
    }

    static decodeBytes(data : Uint8Array) : RTCPackage{
        let type : number = data[0];
        let content = data.slice(1);
        return new RTCPackage(type, RTCPackage.Data.decode(content, type));
    }

    static decodeString(data : string) : RTCPackage{
        let obj = JSON.parse(data);
        return new RTCPackage(obj.type, obj.data);
    }

    static decode(data : any) : RTCPackage{
        if(data instanceof Uint8Array) return RTCPackage.decodeBytes(data as Uint8Array);
        if(data instanceof String) return RTCPackage.decodeString(data as string);
        throw("cant decode data");
    }
}



export namespace RTCPackage{
    export enum Type{
        WireframeData = 0,
    }

    export interface Coordinates {
        x:number;
        y:number;
        z:number;
    }


    export class Data{

        encodeBinary() : Uint8Array{
            throw("not implemented yet");
        }

        static decode(data : any, type : RTCPackage.Type) : Data{
            switch(type){
                case RTCPackage.Type.WireframeData:
                    return WireFrameData.decode(data);
                default:
                    throw("rtc data type invalid");
            }
        }


    }


    export class WireFrameData implements Data{
        readonly data : Array<Coordinates>;
        readonly bytesPerDigit;

        constructor(bytesPerDigit? : number){
            this.bytesPerDigit = bytesPerDigit==null?2:bytesPerDigit;
            this.data = new Array();
        }

        add(coordinates : Coordinates){
            this.data.push(coordinates);
        }


        encodeBinary() : Uint8Array{
            let out = new Uint8Array(3 * this.data.length * this.bytesPerDigit + 1);

            let sizeFieldBytes = 1;
            out[0] = this.bytesPerDigit; //size specificator

            for(let i=0; i<this.data.length; i+=this.bytesPerDigit){

                let xIndex = sizeFieldBytes + 3*i;
                let yIndex = sizeFieldBytes + 3*i + this.bytesPerDigit;
                let zIndex = sizeFieldBytes + 3*i + 2* this.bytesPerDigit;

                const encodedX = this.encodeNumberBinary(this.data[i].x, this.bytesPerDigit);
                const encodedY = this.encodeNumberBinary(this.data[i].y, this.bytesPerDigit);
                const encodedZ = this.encodeNumberBinary(this.data[i].z, this.bytesPerDigit);
                for(let byteIndex=0; byteIndex<this.bytesPerDigit; byteIndex++){
                    out[xIndex+byteIndex] = encodedX[byteIndex];
                    out[yIndex+byteIndex] = encodedY[byteIndex];
                    out[zIndex+byteIndex] = encodedZ[byteIndex];
                }

            }

            return out;
        }

        private encodeNumberBinary(number : number, bytes : number): Uint8Array{
            const digits = Math.pow(2, bytes*8).toString().length - 1;
            const normalizedNumber = Math.round(number * Math.pow(10, digits));
            const out = new Uint8Array(bytes);
            const mask = 255; //111111111
            
            for(let i=0; i<bytes; i++){
                out[i] = (normalizedNumber >> 8*i) & mask;
            }
            return out;
        }

        private static decodeNumberBinary(encoded : Uint8Array) : number{
            let out = 0;
            const mask = 255; //111111111
            const digits = Math.pow(2, encoded.length*8).toString().length - 1;
            for(let i=0; i<encoded.length; i++){
                out += encoded[i] << 8*i;
            }
            out = parseFloat((out * (1/Math.pow(10, digits))).toPrecision(digits));
            return out;
        }

        static decodeBinary(bytes : Uint8Array) : WireFrameData{
            
            let out = new WireFrameData(bytes[0]); //size specificator

            if((bytes.length-1) % 3*out.bytesPerDigit != 0)
                throw("wrong size");

            for(let i=1; i<bytes.length; i+=3*out.bytesPerDigit){
                out.add({x: WireFrameData.decodeNumberBinary(bytes.slice(i, i + out.bytesPerDigit)),
                    y: WireFrameData.decodeNumberBinary(bytes.slice(i + out.bytesPerDigit, i + 2*out.bytesPerDigit)),
                    z: WireFrameData.decodeNumberBinary(bytes.slice(i + 2*out.bytesPerDigit, i + 3*out.bytesPerDigit))
                } as Coordinates);
            }
            return out;
        }

        static decodeString(data : string) : WireFrameData{
            let out = new WireFrameData();
            JSON.parse(data).forEach((item : Coordinates) => {
                out.add(item);
            });
            return out;
        }

        static decode(data : any) : WireFrameData{
            if(data instanceof Uint8Array) return this.decodeBinary(data as Uint8Array);
            if(data instanceof String) return this.decodeString(data as string);
            throw("invailid input type");
        }
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

        if(data !== null) this.data = data;
        if(replyFor != null) this.replyFor = replyFor;
        if(fwdAddr !== null) this.fwdAddr = fwdAddr;
    }
    
    static deserialize(encrypted: string) : SocketPackage {        
        let object = JSON.parse(encrypted);
        return new SocketPackage(object.event, object.data, object.fwdAddr == null ? null : new AddressLabel(object.fwdAddr.sender, object.fwdAddr.receiver), object.id, object.replyFor);
    }

    isReply(){
        return this.replyFor == null ? false : true;
    }

    reply(data : any) : SocketPackage {
        let addr = null;

        if(this.fwdAddr != null) addr = new AddressLabel(this.fwdAddr.receiver, this.fwdAddr.sender);

        let reply = new SocketPackage(this.event , data, addr, null, this.id);
        return reply;
    }

    isErrorPackage() : boolean{
        if(this.event == "error" || this.event == "error_re") return true;
        return false;
    }

    replyError(message : String) : SocketPackage {
        let addr = null;

        if(this.fwdAddr != null) addr = new AddressLabel(this.fwdAddr.receiver, this.fwdAddr.sender);

        let reply = new SocketPackage("error", {message : message}, addr, null, this.id);
        return reply;
    }

    replyOK(){
        let addr = null;

        if(this.fwdAddr != null) addr = new AddressLabel(this.fwdAddr.receiver, this.fwdAddr.sender);

        let reply = new SocketPackage("ok", null, addr, this.id, this.id);
        return reply;
    }

    serialize() {
        let object : any = {};
        object.event = this.event;

        object.id = this.id;

        if(this.fwdAddr != null) object.fwdAddr = this.fwdAddr.getData();
        if(this.data != null) object.data = this.data;
        if(this.replyFor != null) object.replyFor = this.replyFor;

        return JSON.stringify(object);
    }
}



export class ErrorPackage extends SocketPackage{
    
    constructor (e : string){
        super('error', {'message' : e});
    }

}
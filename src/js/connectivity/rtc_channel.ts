const CHANNEL_ID = 10;

export class RTCChannel{
    private binaryChannel;
    

    onData(peerId : number, dataIdentifier : RTCChannel.DataType, data : Int8Array){};

    constructor(peer : RTCPeerConnection, peerId : number){
        this.binaryChannel = peer.createDataChannel('binaryData', {negotiated: true, id: CHANNEL_ID});
        (peer as any).binaryChannel = this.binaryChannel;

        this.binaryChannel.onmessage = (ev) => {
            let data = new Int8Array(ev.data);
            this.onData(peerId, data[0] as number, data.slice(1))
        };
    }

    send(dataIdentifier :  RTCChannel.DataType, data : Int8Array){
        let out = new Int8Array(data.length + 1);
        let id = new Int8Array(1);
        id[0] = dataIdentifier;

        out.set(id, 0);
        out.set(data, 1);

        this.binaryChannel.send(out);
    }

}


export class RTCPackage{
    readonly data : Map<string, RTCChannel.RTCData>;

    constructor(){

    }

    add(key : string, data : RTCChannel.RTCData){
    }

}

export namespace RTCChannel{

    export enum DataType{
        Undefined,
        FrameData
    }

    export interface RTCData{
        getBytes() : Int8Array;
    }


    export class Data{
        constructor(){

        }
    }


    export class Coordinates implements RTCData{
        private x=0;
        private y=0;
        private z=0;

        constructor(x : number, y : number, z : number){
            this.x = x;
            this.y = y;
            this.z = z;
        }

        getBytes() : Int8Array{
            let out = new Int8Array(3);
            out[0] = this.x;
            out[1] = this.y;
            out[2] = this.z;
            return out;
        }
    }
}

const CSV_NEW_COLUMN = ',';
const CSV_NEW_ROW = '\n';

export class Stats{

    readonly fileName = 'stats.csv';
    static samplingTime = 1000; //ms

    private peerStats : Array<PeerStat>;

    constructor(){
        this.peerStats = new Array<PeerStat>();
    }

    addPeer(peerId : number): PeerStat{
        let stat = new PeerStat(peerId);
        this.peerStats.push(stat);
        return stat;
    }

    private serialize() : string{
        let out = '';

        //header
        this.peerStats.forEach(peerStat => {
            out += "Peer " + peerStat.peerId + CSV_NEW_COLUMN
        });
        out.slice(0, -1);

        //content
        this.peerStats.forEach(peerStat => {
            out += "Peer " + peerStat.peerId + CSV_NEW_COLUMN
        });
        out.slice(0, -1);

        return "";
    }

    public export(){
        this.download(this.serialize(), this.fileName);
    }


    private download(text : string, filename : string){
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
      
        element.style.display = 'none';
        document.body.appendChild(element);
      
        element.click();
      
        document.body.removeChild(element);
    }
}


export class PeerStat{
    readonly peerId;
    readonly samples : Array<Sample>
    private lastSample = 0;

    private encoding : StatTuple;
    private decoding : StatTuple;
    private roundTrip : StatTuple;
    private creatingSample = false;

    constructor(peerId : number){
        this.peerId = peerId;
        this.samples = new Array<Sample>();
        this.encoding = new StatTuple();
        this.decoding = new StatTuple();
        this.roundTrip = new StatTuple();
    }

    beforSampleCreation(){

    }

    add(data : StatsInputData){
        if(this.lastSample == null)
            this.lastSample = data.timestamp;

        if(!this.creatingSample && window.performance.now()-this.lastSample >= Stats.samplingTime){
            this.createSample();
        }

        if(data.type == Stats.InputType.EncodeTime)
            this.encoding.elapsedTime += data.elapsedTime;
            this.encoding.frames += data.frames;

        if(data.type == Stats.InputType.DecodeTime)
            this.decoding.elapsedTime += data.elapsedTime;
            this.decoding.frames += data.frames;

        if(data.type == Stats.InputType.RoundTripTime)
            this.roundTrip.elapsedTime += data.elapsedTime;
            this.roundTrip.frames += data.frames;
    }

    createSample(){
        this.creatingSample = true;
        this.beforSampleCreation();
        let sample = new Sample(this.encoding, this.decoding, this.roundTrip);
        this.samples.push(sample);
        this.encoding.reset(),
        this.decoding.reset(),
        this.roundTrip.reset();
        this.lastSample = window.performance.now();
        this.creatingSample = false;
    }
}

export class StatTuple{
    elapsedTime : number;
    frames : number;

    constructor(elapsedTime?:number, frames?:number){
        this.elapsedTime = elapsedTime;
        this.frames = frames;
    }

    reset(){
        this.elapsedTime = 0;
        this.frames = 0;
    }
}

export class StatSet{
    private readonly data : Map<String, StatTuple>;

    constructor(){
        this.data = new Map();
    }

    add(id : string, tuple : StatTuple){
        this.data.set(id, tuple);
    }

    get(id : string){
        return this.data.get(id);
    }
}


export class Sample{
    readonly timestamp : number;
    readonly decodingTime : number;
    readonly encodingTime : number;
    readonly roundTripTime : number;

    constructor(decodingTime : StatTuple, encodingTime : StatTuple, roundTrip : StatTuple){
        this.timestamp = window.performance.now();
        this.decodingTime = decodingTime.elapsedTime / decodingTime.frames;
        this.encodingTime = encodingTime.elapsedTime / encodingTime.frames;
        this.roundTripTime = roundTrip.elapsedTime / roundTrip.frames;
    }

}


export class StatsInputData{
    readonly timestamp : number;
    readonly type : Stats.InputType;
    readonly elapsedTime : number;
    readonly frames : number;

    constructor(type : Stats.InputType, elapsedTime : number, frames : number){
        this.timestamp = window.performance.now();
        this.type = type;
        this.elapsedTime = elapsedTime;
        this.frames = frames;
    }

}

export namespace Stats{
    export enum InputType{
        EncodeTime,
        DecodeTime,
        RoundTripTime
    }
}
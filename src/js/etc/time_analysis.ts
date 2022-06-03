const CSV_NEW_COLUMN = ',';
const CSV_NEW_ROW = '\n';


export class TimeAnalysis{

    readonly fileName = 'stats.csv';
    static samplingTime = 1000; //ms
    private readonly fields : Array<string>;
    private readonly records : Array<TimeAnalysis.Record>;

    constructor(){
        this.records = new Array<TimeAnalysis.Record>();
        this.fields = new Array<string>();
        this.fields.push('time');
    }

    newRecord(){
        this.records.push(new TimeAnalysis.Record());
    }

    add(title : string, value : number){
        console.log(title);
        console.log(value);
        this.records[this.records.length-1].add(title, value);
        if(!this.fields.includes(title))
            this.fields.push(title);
    }

    private serialize() : string{
        let out = '';

        //header
        this.fields.forEach(field => {
            out += field + CSV_NEW_COLUMN
        });
        out.slice(0, -1);

        //content
        this.records.forEach(record => {
            record.items.forEach((value, title)=>{
                out += value + CSV_NEW_COLUMN
            })
            
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

export namespace TimeAnalysis{
    export class Record{
        private readonly timestamp : number;
        readonly items : Map<string, number>
        constructor(){
            this.timestamp = window.performance.now();
            this.items = new Map();
        }

        add(title : string, value : number){
            this.items.set(title, value);
        }
    }
}


export class TimeSample{
    readonly period: number;
    readonly items : Map<string, number>;

    constructor(period : number, items : Map<string, number>){
        this.period = period;
        this.items = items;
    }

}

export namespace TimeSample{
    interface Item{
        period : number
    }
}

export class TimeRecord{
    private readonly items : Map<string, TimeRecord.Item>;
    private lastSample : number;

    constructor(){
        this.items = new Map();
    }

    exportSample(){
        if(this.lastSample == 0){
            this.lastSample = window.performance.now();
            return;
        }

        let map = new Map<string, number>();
        this.items.forEach((item, key)=>{
            map.set(key, item.getAverage());
            item.reset();
        })

        return new TimeSample(window.performance.now() - this.lastSample,  map);
    }


    get(key : string){
        return this.items.get(key);
    }

    add(key : string, value : number, samples : number){
        if(this.items.has(key)){
            this.items.get(key).add(value, samples);
            return;
        }
        this.items.set(key, new TimeRecord.Item(value, samples));
    }

    addContinious(key : string, absoluteValue : number, absoluteSamples : number){
        if(!this.items.has(key)) this.items.set(key, new TimeRecord.Item());
        this.items.get(key).addContinuous(absoluteValue, absoluteSamples);
    }

    measure(key : string){
        if(!this.items.has(key)) this.items.set(key, new TimeRecord.Item());
        this.items.get(key).measure();
    }

    stopMeasuring(key : string){
        if(!this.items.has(key)) throw("item does no exist");
        this.items.get(key).stopMeasuring();
    }
}

export namespace TimeRecord{
    export class Item{
        private samples = 0;
        private value = 0;
        public lastAbsoluteSamples = 0;
        private lastAbsoluteValue = 0;
        private measure_start : number;
        private measuring = false;
    
        constructor(value?:number, samples?:number){
            this.value = value;
            this.samples = samples;
        }

        addContinuous(absoluteValue : number, absoluteSamples : number){
            if(absoluteSamples == 0){
                this.lastAbsoluteSamples = absoluteSamples;
                this.lastAbsoluteValue = absoluteValue;
                return;
            }

            console.log(absoluteValue - this.lastAbsoluteValue);
            console.log(absoluteSamples - this.lastAbsoluteSamples);


            this.value += (absoluteValue - this.lastAbsoluteValue);
            this.samples += (absoluteSamples - this.lastAbsoluteSamples);

            console.log(this.value);
            console.log(this.samples);

            this.lastAbsoluteValue = absoluteValue;
            this.lastAbsoluteSamples = absoluteSamples;
            
        }

        add(value : number, samples : number){
            this.value += value;
            this.samples += samples;
        }

        measure(){
            this.measuring = true;
            this.measure_start = window.performance.now();
        }

        stopMeasuring(){
            if(this.measuring) this.add(window.performance.now() - this.measure_start, 1);
            this.measuring = false;
        }
    
        reset(){
            this.value = 0;
            this.samples = 0;
        }

        getAverage(){
            if(this.samples != 0)
            return this.value / this.samples;
        }
    }
}

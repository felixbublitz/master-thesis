const CSV_NEW_COLUMN = ',';
const CSV_NEW_ROW = '\n';

export class PerformanceStatistic{

    readonly fileName = 'stats.csv';
    static samplingTime = 1000; //ms
    private readonly fields : Array<string>;
    private readonly datasets : Array<PerformanceStatistic.Dataset>;
    private readonly startTime;

    constructor(){
        this.datasets = new Array<PerformanceStatistic.Dataset>();
        this.fields = new Array<string>();
        this.startTime = Date.now();
        this.fields.push('time');
    }

    add(dataset : PerformanceStatistic.Dataset){
        this.datasets.push(dataset);
        dataset.items.forEach((item, title) => {
            if(!this.fields.includes(title))
                this.fields.push(title);
        });
    }

    private serialize() : string{
        let out = '';

        //header
        this.fields.forEach(field => {
            out += field + CSV_NEW_COLUMN
        });
        out = out.slice(0, -1);
        out += CSV_NEW_ROW;

        //content
        this.datasets.forEach(dataset => {
            out += (dataset.timestamp - this.startTime) + CSV_NEW_COLUMN;
            dataset.items.forEach((value, title)=>{
                out += value + CSV_NEW_COLUMN
            });
            out = out.slice(0, -1);
            out += CSV_NEW_ROW;
            
        });
       
        return out;
    }

    public export(){
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.serialize()));
        element.setAttribute('download', this.fileName);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
}

export namespace PerformanceStatistic{
    export class Dataset{
        readonly timestamp : number;
        readonly items : Map<string, number>
        constructor(){
            this.timestamp = Date.now();
            this.items = new Map();
        }

        add(title : string, value : number){
            this.items.set(title, value);
        }
    }
}


export class PerformanceMeter{
    private readonly items : Map<string, PerformanceMeter.MeasuringItem>;
    private lastSample : number;

    constructor(){
        this.items = new Map();
    }

    sample() : PerformanceMeter.Sample{
        if(this.lastSample == 0){
            this.lastSample = window.performance.now();
            return;
        }

        let map = new Map<string, number>();
        this.items.forEach((item, key)=>{
            map.set(key, item.getAverage());
            item.reset();
        })

        return new PerformanceMeter.Sample(window.performance.now() - this.lastSample,  map);
    }

    get(key : string){
        return this.items.get(key);
    }

    add(key : string, value : number, samples : number){
        if(this.items.has(key)){
            this.items.get(key).add(value, samples);
            return;
        }
        this.items.set(key, new PerformanceMeter.MeasuringItem(value, samples));
    }

    addContinious(key : string, absoluteValue : number, absoluteSamples : number){
        if(!this.items.has(key)) this.items.set(key, new PerformanceMeter.MeasuringItem());
        this.items.get(key).addContinuous(absoluteValue, absoluteSamples);
    }

    measure(key : string){
        if(!this.items.has(key)) this.items.set(key, new PerformanceMeter.MeasuringItem());
        this.items.get(key).measure();
    }

    stopMeasuring(key : string){
        if(!this.items.has(key)) throw("item does no exist");
        this.items.get(key).stopMeasuring();
    }
}

export namespace PerformanceMeter{

    export class Sample{
        readonly period: number;
        private readonly items : Map<string, number>;
    
        constructor(period : number, items : Map<string, number>){
            this.period = period;
            this.items = items;
        }
        
        has(key : string){
            return this.items.has(key);
        }
        get(key : string){
            return this.items.get(key);
        }
    }

    export class MeasuringItem{
        private samples = 0;
        private value = 0;
        public lastAbsoluteSamples = 0;
        private lastAbsoluteValue = 0;
        private measure_start : number;
        private measuring = false;
    
        constructor(value?:number, samples?:number){
            this.value = value?value : 0;
            this.samples = samples?samples : 0;
        }

        addContinuous(absoluteValue : number, absoluteSamples : number){
            if(absoluteSamples == 0){
                this.lastAbsoluteSamples = absoluteSamples;
                this.lastAbsoluteValue = absoluteValue;
                return;
            }

            this.value += (absoluteValue - this.lastAbsoluteValue);
            this.samples += (absoluteSamples - this.lastAbsoluteSamples);
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

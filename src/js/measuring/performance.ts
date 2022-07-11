
export class PerformanceMeter{
    private readonly items : Map<string, PerformanceMeter.MeasuringItem>;
    private lastSample : number;

    constructor(){
        this.items = new Map();
    }

    async sample() : Promise<PerformanceMeter.Sample>{
        await this.beforeSample();
        return new Promise((resolve, reject)=>{
            if(this.lastSample == 0){
                this.lastSample = window.performance.now();
                resolve(null);
            }

        let map = new Map<string, number>();
        this.items.forEach((item, key)=>{
            map.set(key, item.getAverage());
            item.reset();
        })

        resolve(new PerformanceMeter.Sample(window.performance.now() - this.lastSample,  map));
        });
    }

    reset(){
        this.items.clear();
        this.beforeSample = ()=>{};
    }

    beforeSample(){

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
        public lastAbsoluteSamples = -1;
        private lastAbsoluteValue = 0;
        private measure_start : number;
        private measuring = false;
    
        constructor(value?:number, samples?:number){
            this.value = value?value : 0;
            this.samples = samples?samples : 0;
        }

        addContinuous(absoluteValue : number, absoluteSamples : number){
            if(this.lastAbsoluteSamples == -1){
                this.lastAbsoluteSamples = absoluteValue;
                this.lastAbsoluteValue = absoluteSamples;
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
            if(this.measuring)
                this.stopMeasuring();
            this.value = 0;
            this.samples = 0;
        }

        getAverage(){
            if(this.samples != 0)
            return this.value / this.samples;
        }
    }
}

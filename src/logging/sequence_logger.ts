export class SequenceLogger{
    private readonly items : Map<string, SequenceLogger.Item>;
    private lastSample : number;

    constructor(){
        this.items = new Map();
    }

    async sample() : Promise<SequenceLogger.Sample>{
        await this.beforeSample();
        return new Promise((resolve, reject)=>{
            if(this.lastSample == 0){
                this.lastSample = window.performance.now();
                resolve(null);
            }

        let list = new Array<Parameter>();
        
        this.items.forEach((item, key)=>{
            const param = item.getSample();
            param.title = key;
            list.push(param);
            item.reset();
        })

        resolve(new SequenceLogger.Sample(window.performance.now() - this.lastSample,  list));
        });
    }

    reset(){
        this.items.clear();
        //this.beforeSample = ()=>{};
    }

    beforeSample(){

    }

    get(key : string){
        return this.items.get(key);
    }

    add(key : string, item : SequenceLogger.Item){
        this.items.set(key, item);
    }

    remove(key : string){
        this.items.delete(key);
    }

}


export class Parameter{
    public title : string;
    public unit : string;
    public value : string;

    public getTitle(includeUnit?:boolean) : string{
        return (includeUnit && this.unit!=null)?this.title+" [" + this.unit + "]" : this.title;
    }

    constructor(title: string, value : string, unit?:string){
        this.unit = unit;
        this.value = value
        this.title = title;
    }
}


export namespace SequenceLogger{

    export interface Item{
        getSample() : Parameter;
        reset() : void;
        getValue() : any;
    }

    export class Sample{
        readonly period: number;
        public readonly items : Array<Parameter>;
    
        constructor(period : number, items : Array<Parameter>){
            this.period = period;
            this.items = items;
        }

        has(title : string) : boolean{
            for(const param of this.items){
                if(param.getTitle() == title) return true;
            }
            return false;
        }

        get(title : string) : Parameter{
            for(const param of this.items){
                if(param.getTitle() == title) return param;
            }
        }
        
    }
}

export class StringItem implements SequenceLogger.Item{
    private value = "";

    constructor(){
    }

    set(value : string){
        this.value = value;
    }

    
    reset(){
       this.value = "";
    }


    getValue(){
        return this.value;
    }

    getSample(){
        return new Parameter(null, this.getValue());
    }
}


    export class TimeMeasuringItem implements SequenceLogger.Item{
        private samples = 0;
        private value = 0;
        public lastAbsoluteSamples = -1;
        private lastAbsoluteValue = 0;
        private measure_start : number;
        private measuring = false;
        private precision = 17
        private unit : string;

        constructor(precision?:number, unit?:string){
            this.precision = typeof precision === 'undefined' ? this.precision : precision;
            this.unit = unit===null ? this.unit : unit;
        }

        addContinuous(absoluteValue : number, absoluteSamples : number){
            if(this.lastAbsoluteSamples == -1){
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
            if(this.measuring)
                this.stopMeasuring();
            this.value = 0;
            this.samples = 0;
        }


        getValue(){
            return this.samples == 0 ? 0 : this.value / this.samples;
        }
    
        getSample(){
            return new Parameter(null, ""+ Math.round((10**this.precision) * this.getValue()) / (10**this.precision), this.unit);
        }
    }
    


    export class ValueMeasuringItem implements SequenceLogger.Item{
        private value = 0;
        private lastAbsoluteValue = -1;
        private measure_start : number;
        private measuring = false;
        private precision = 17
        private unit : string;
    
        constructor(precision?:number, unit?:string){
            this.precision = typeof precision === 'undefined' ? this.precision : precision;
            this.unit = unit===null ? this.unit : unit;

        }

        addContinuous(absoluteValue : number){
            if(this.lastAbsoluteValue == -1){
                this.lastAbsoluteValue = absoluteValue;
                return;
            }
            this.value += (absoluteValue - this.lastAbsoluteValue);
            this.lastAbsoluteValue = absoluteValue;
        }
    
        add(value : number){
            this.value += value;
        }
    
        measure(){
            this.measuring = true;
            this.measure_start = window.performance.now();
        }
    
        stopMeasuring(){
            if(this.measuring) this.add(window.performance.now() - this.measure_start);
            this.measuring = false;
        }
    
        reset(){
            if(this.measuring)
                this.stopMeasuring();
            this.value = 0;
        }

        getValue(){
            return this.value;
        }
    
        getSample(){
            return new Parameter(null, ""+ Math.round((10**this.precision) * this.getValue()) / (10**this.precision), this.unit);
        }
    }


    export class PerSecondItem implements SequenceLogger.Item{
        private value = 0;
        private lastAbsoluteValue = -1;
        private measure_start : number;
        private measuring = false;
        private resetTime = 0;
        private precision = 17;
        private unit : string;
    
        constructor(precision?:number, unit?:string){
            this.precision = typeof precision === 'undefined' ? this.precision : precision;
            this.resetTime = window.performance.now();
            this.unit = unit===null ? this.unit : unit;
        }

        private getElapsedTime(){
            return window.performance.now()-this.resetTime;
        }

        addContinuous(absoluteValue : number){
            if(this.lastAbsoluteValue == -1){
                this.lastAbsoluteValue = absoluteValue;
                return;
            }
            this.value += (absoluteValue - this.lastAbsoluteValue);
            this.lastAbsoluteValue = absoluteValue;
        }
    
        add(value : number){
            this.value += value;
        }
    
        measure(){
            this.measuring = true;
            this.measure_start = window.performance.now();
        }
    
        stopMeasuring(){
            if(this.measuring) this.add(window.performance.now() - this.measure_start);
            this.measuring = false;
        }
    
        reset(){
            if(this.measuring)
                this.stopMeasuring();
            this.value = 0;
            this.resetTime = window.performance.now();
        }

        getValue(){
            return (this.value*1000)/this.getElapsedTime();
        }
    
        getSample(){
            return new Parameter(null, ""+Math.round((10**this.precision) * this.getValue()) / (10**this.precision), this.unit);
        }
    }
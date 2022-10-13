import { PerSecondItem, SequenceLogger, TimeMeasuringItem } from "../measuring/performance";
import { RenderModel } from "./models/render_model";

export class Renderer{

    protected readonly domElement : HTMLElement;
    protected sequenceLogger : SequenceLogger;
    private renderModel : RenderModel;

    onData(renderObject: RenderObject) : void{}


    constructor(domElement: HTMLElement){
        this.domElement = domElement;
        this.sequenceLogger = new SequenceLogger();
    }


    setRenderModel(model : RenderModel){
        this.clear();
        if(model == null) return;
        this.renderModel = model;
        this.domElement.appendChild(model.domRenderer);
        this.sequenceLogger.reset();
    }

    public async getPerformanceSample() : Promise<SequenceLogger.Sample>{       
        return this.sequenceLogger.sample();
    }

    clear(){
        this.domElement.childNodes.forEach(node =>{
            this.domElement.removeChild(node);
        }) 
        this.renderModel = null;
        this.sequenceLogger.remove('render');
        this.sequenceLogger.remove('fps');

    }

    render(renderObject : RenderObject){
        if(this.renderModel == null) return;

        const customPerformanceMeasurement = this.renderModel.customPerformanceMeasurement(this.sequenceLogger, renderObject);

        if(!customPerformanceMeasurement) {
            if(this.sequenceLogger.get('render') == null) this.sequenceLogger.add('render', new TimeMeasuringItem(2, 'ms'));
            if(this.sequenceLogger.get('fps') == null) this.sequenceLogger.add('fps', new PerSecondItem(0));
            (this.sequenceLogger.get('render') as TimeMeasuringItem).measure();
        }

        if(!customPerformanceMeasurement){
            (this.sequenceLogger.get('render') as TimeMeasuringItem).measure();
            (this.sequenceLogger.get('fps') as PerSecondItem).add(1);
        }
        this.renderModel.renderFrame(renderObject);

        if(!customPerformanceMeasurement) (this.sequenceLogger.get('render') as TimeMeasuringItem).stopMeasuring();
    }
}

export class RenderObject{
    rtcStats = false;
    readonly data : any;

    constructor(data : any, rtcStats? : boolean){
        this.data = data;
        this.rtcStats = rtcStats?rtcStats:false;
    }

}
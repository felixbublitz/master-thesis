import { PerformanceMeter } from "../measuring/performance";
import { RenderModel } from "./models/render_model";

export class Renderer{

    protected readonly domElement : HTMLElement;
    protected performanceMeter : PerformanceMeter;
    private renderModel : RenderModel;

    onData(renderObject: RenderObject) : void{}


    constructor(domElement: HTMLElement){
        this.domElement = domElement;
        this.performanceMeter = new PerformanceMeter();
    }


    setRenderModel(model : RenderModel){
        if(model == null) return;
        this.clear();
        this.renderModel = model;
        this.domElement.appendChild(model.domRenderer);
        this.performanceMeter.reset();
    }

    public async getPerformanceSample() : Promise<PerformanceMeter.Sample>{       
        return this.performanceMeter.sample();
    }

    clear(){
        this.domElement.childNodes.forEach(node =>{
            this.domElement.removeChild(node);
        }) 
    }

    render(renderObject : RenderObject){
        if(this.renderModel == null)
        return;

        const customPerformanceMeasurement = this.renderModel.customPerformanceMeasurement(this.performanceMeter, renderObject);

        if(!customPerformanceMeasurement) this.performanceMeter.measure('render');
        this.renderModel.renderFrame(renderObject);
        if(!customPerformanceMeasurement) this.performanceMeter.stopMeasuring('render');
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
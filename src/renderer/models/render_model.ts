import { SequenceLogger } from "../../measuring/performance";
import { RenderObject } from "../renderer";

export interface RenderModel{
    domRenderer : HTMLElement;
    
    init(data : any) : void;
    renderFrame(renderObject: RenderObject): void;
    customPerformanceMeasurement(meter: SequenceLogger, renderObject : RenderObject) : boolean;
    destruct() : void;
}
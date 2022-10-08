import { SequenceLogger, TimeMeasuringItem } from "../../measuring/performance";
import { RenderObject } from "../renderer";
import { RenderModel } from "./render_model";

const S_TO_MS = 1000;

export class VideoRenderModel implements RenderModel{

    domRenderer : HTMLVideoElement = document.createElement('video');
    private width = 320;
    private height = 180;

    constructor(){
        this.domRenderer.width = this.width;
        this.domRenderer.height = this.height;
        this.domRenderer.autoplay = true;
        this.domRenderer.playsInline = true;

        
    }

    customPerformanceMeasurement(meter: SequenceLogger, renderObject : RenderObject): boolean {
        return true;
    }

    init(data: any): void {}

    renderFrame(renderObject: RenderObject) {
        this.domRenderer.srcObject = renderObject.data.stream;
    }

    destruct(): void {
        let video = this.domRenderer as HTMLVideoElement;
        video.pause();
        video.removeAttribute('src');
        window.setTimeout(() => {
            video.load();
        }, (50));
    }

}
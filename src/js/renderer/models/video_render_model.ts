import { PerformanceMeter } from "../../measuring/performance";
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

    customPerformanceMeasurement(meter: PerformanceMeter, renderObject : RenderObject): boolean {
        if(!renderObject.rtcStats) return;

        meter.beforeSample = async()=>{
            
            await renderObject.data.peer.getStats().then((stats : any)=>{
                let decodeStat = stats.get(renderObject.data.statsKey);
                console.log(decodeStat);
                meter.addContinious('decoding', decodeStat.totalDecodeTime * S_TO_MS, decodeStat.framesDecoded);
                console.log("before done");
            });

        }
        meter.sample();
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
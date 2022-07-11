import { RenderObject } from "../../renderer/renderer";

export interface Codec{
    startEncoding() : void;
    encodeFrame(videoDom : HTMLVideoElement) : Int8Array;
    decodeFrame(data : Int8Array) : RenderObject;
}


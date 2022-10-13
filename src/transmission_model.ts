import { Codec } from "./encoding/codecs/codec";
import { RenderModel } from "./renderer/models/render_model";

export interface TransmissionModel{
    name : string;
    renderModel : RenderModel;
    codec : Codec;
}
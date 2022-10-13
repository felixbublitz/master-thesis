import { Codec } from "../encoding/codec";
import { RenderModel } from "../renderer/render_model";

export interface TransmissionModel{
    name : string;
    renderModel : RenderModel;
    codec : Codec;
}
export enum CodecType{
    Undefined,
    Video,
    FaceMask
}

export interface Coordinates {
    x:number;
    y:number;
    z:number;
}


export interface FaceMaskData{
    readonly data : Array<Coordinates>;
    readonly bytesPerDigit : number;
}
  
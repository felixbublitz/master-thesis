import { precision } from "numeric";

export enum CodecType{
    Undefined,
    Video,
    FaceMask
}


export interface EncodableData{

}

export class EncodablePrimitive implements EncodableData{
    constructor(...args : any){

    }
    encode(precision : number, includeHeader : boolean) : Int8Array {throw("not implemented")};
    static getEncodedSize(precision : number, includeHeader : boolean) : number {throw("not implemented")};;
    static decode(binary : Int8Array, precision? : number) : EncodablePrimitive {throw("not implemented")};
    public getValue() : any {return null;};

}


export class EncodableCoordinates extends EncodablePrimitive {
    private x:EncodableNumber;
    private y:EncodableNumber;
    private z:EncodableNumber;

    getValue(){
        return {x : this.x.getValue(), y : this.y.getValue(), z: this.z.getValue()}
    }

    static getEncodedSize(precision: number, includeHeader: boolean): number {
        return Number(includeHeader) + 3*precision;
    }

    constructor(x : number, y : number, z: number){
        super();
        this.x = new EncodableNumber(x); 
        this.y = new EncodableNumber(y);
        this.z = new EncodableNumber(z);
    }

    public encode(precision : number, includeHeader? : boolean) : Int8Array{
        let out = new Int8Array(3 * precision + Number(includeHeader));
        const encodedX = this.x.encode(precision);
        const encodedY = this.y.encode(precision);
        const encodedZ = this.z.encode(precision);

        if(includeHeader) out[0] = precision;
        let xIndex = Number(includeHeader);
        let yIndex = xIndex + precision;
        let zIndex = yIndex + precision;

        for(let byteIndex=0; byteIndex<precision; byteIndex++){
            out[xIndex+byteIndex] = encodedX[byteIndex];
            out[yIndex+byteIndex] = encodedY[byteIndex];
            out[zIndex+byteIndex] = encodedZ[byteIndex];
        }
        return out;
    }

    static decode(binary : Int8Array, precision? : number) : EncodablePrimitive{
        let includesHeader = precision == null?true:false;
        if(precision == null) precision = binary[0]
                
        if((binary.length-Number(includesHeader)) % 3*precision != 0)
            throw("wrong size");
    
        let xIndex = Number(includesHeader);
        let yIndex = xIndex + precision;
        let zIndex = yIndex + precision;

        return new EncodableCoordinates(
            EncodableNumber.decode(binary.slice(xIndex, xIndex + precision), precision).getValue(),
            EncodableNumber.decode(binary.slice(yIndex, yIndex + precision), precision).getValue(),
            EncodableNumber.decode(binary.slice(zIndex, zIndex + precision), precision).getValue()
        );
    }
}



export class Encodable2DCoordinates extends EncodablePrimitive {
    private x:EncodableNumber;
    private y:EncodableNumber;

    getValue(){
        return {x : this.x.getValue(), y : this.y.getValue()}
    }

    static getEncodedSize(precision: number, includeHeader: boolean): number {
        return Number(includeHeader) + 2*precision;
    }

    constructor(x : number, y : number){
        super();
        this.x = new EncodableNumber(x); 
        this.y = new EncodableNumber(y);
    }

    public encode(precision : number, includeHeader? : boolean) : Int8Array{
        let out = new Int8Array(2 * precision + Number(includeHeader));
        const encodedX = this.x.encode(precision);
        const encodedY = this.y.encode(precision);

        if(includeHeader) out[0] = precision;
        let xIndex = Number(includeHeader);
        let yIndex = xIndex + precision;

        for(let byteIndex=0; byteIndex<precision; byteIndex++){
            out[xIndex+byteIndex] = encodedX[byteIndex];
            out[yIndex+byteIndex] = encodedY[byteIndex];
        }
        return out;
    }

    static decode(binary : Int8Array, precision? : number) : EncodablePrimitive{
        let includesHeader = precision == null?true:false;
        if(precision == null) precision = binary[0]
                
        if((binary.length-Number(includesHeader)) % 2*precision != 0)
            throw("wrong size");
    
        let xIndex = Number(includesHeader);
        let yIndex = xIndex + precision;

        return new Encodable2DCoordinates(
            EncodableNumber.decode(binary.slice(xIndex, xIndex + precision), precision).getValue(),
            EncodableNumber.decode(binary.slice(yIndex, yIndex + precision), precision).getValue(),
        );
    }
}


export class EncodableNumber extends EncodablePrimitive{
    private value : number;

    constructor(value : number){
        super();
        this.value = value;
    }

    private beforeDecimal(num : number) {
        if (Number.isInteger(num)) {
          return 1;
        }
      
        return num.toString().split('.')[0].length;
      }

    getValue() {
        return this.value;
    }

    static getEncodedSize(precision: number, includeHeader: boolean): number {
        return Number(includeHeader) + precision;
    }

    public encode(precision : number) : Int8Array{
        //if(precision >4)
           //throw("byte size must be <= 4");

        //const digits = EncodableNumber.getDigitCountFromBytes(precision);
        //const normalizedNumber = Number(Math.round(this.value * Math.pow(10, digits)));
        const out = new ArrayBuffer(precision);
        //const mask = Number(255); //11111111

        switch(precision){
            case 1:
                new DataView(out).setInt8(0,this.value*10);
                break;
            case 2:
                new DataView(out).setInt16(0,this.value*1000);
                break;
            case 4:
                new DataView(out).setFloat32(0,this.value);
                break;
            case 8: 
            new DataView(out).setFloat64(0,this.value);
                break;
            default:
                throw('precision must be 2^n')
        }
     
        return new Int8Array(out);
    }

    static decode(binary : Int8Array, precision : number) : EncodableNumber{

        //precision = 8;
       
        switch(precision){
            case 1:
                return new EncodableNumber(new DataView(binary.buffer,0).getInt8(0)/10);
            case 2:
                return new EncodableNumber(new DataView(binary.buffer,0).getInt16(0)/1000);
            case 4:
                return new EncodableNumber(new DataView(binary.buffer,0).getFloat32(0));
            case 8: 
                return new EncodableNumber(new DataView(binary.buffer,0).getFloat64(0));
            default:
                throw('precision must be 2^n')
        }


    }

    private static getDigitCountFromBytes(bytes : number) : number{
        return (Math.pow(2, bytes*8)/2).toString().length - 1;
    }
}

export class EncodableArray implements EncodableData {
    readonly data : Array<EncodablePrimitive>;

    get length(){
        return this.data.length;
    }

    empty(){
        this.data.length = 0;
    }

    getValue(index? : number){
        return index == null ? this.getArray() : this.getElement(index);
    }

    private getElement(index : number){
        return this.data[index].getValue();
    }

    static getEncodedSize(items : number, elementType : typeof EncodablePrimitive, precision: number, includeHeader: boolean){
        return Number(includeHeader) + items * elementType.getEncodedSize(precision, false);
    }

    private getArray(){
        const out = Array(this.length);
        for(let i=0; i<this.length; i++){
            out[i] = this.data[i].getValue();
        }
        return out;
    }
    
    constructor(){
        this.data = new Array();
    }

    add(value : EncodablePrimitive){
        this.data.push(value);
    }

    encode(elementType : typeof EncodablePrimitive, precision: number, includeHeader = false): Int8Array {

        

        const elementSize = elementType.getEncodedSize(precision, false)
        let out = new Int8Array(Number(includeHeader) + this.data.length * elementSize);
        
        if(includeHeader) out[0] = precision;

        for(let i=0; i<this.data.length; i+=1){
            const encodedElement = this.data[i].encode(precision, false);
            for(let byteIndex=0; byteIndex<elementSize; byteIndex++){
                out[i*elementSize + byteIndex] = encodedElement[byteIndex];
            }
        }
        return out;
    }

    static decode(binary : Int8Array, elementType : typeof EncodablePrimitive , precision? : number) : EncodableArray{
        const includesHeader = precision== null?true:false;
        if(precision == null) precision = binary[0]
                
        let out = new EncodableArray(); 
        const elementSize = elementType.getEncodedSize(precision, false);

        if((binary.length-Number(includesHeader)) % elementSize != 0)
            throw("wrong size");

        for(let i=Number(includesHeader); i<binary.length; i+=elementSize){
            out.add(elementType.decode(binary.slice(i, i+ elementSize), precision));
        }
        return out;
    }

}

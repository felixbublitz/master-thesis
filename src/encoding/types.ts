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
            EncodableNumber.decode(binary.slice(xIndex, xIndex + precision)).getValue(),
            EncodableNumber.decode(binary.slice(yIndex, yIndex + precision)).getValue(),
            EncodableNumber.decode(binary.slice(zIndex, zIndex + precision)).getValue()
        );
    }
}


export class EncodableNumber extends EncodablePrimitive{
    private value : number;

    constructor(value : number){
        super();
        this.value = value;
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

        new DataView(out).setFloat64(0,this.value);
     

        

        /*for(let i=0; i<precision; i++){
            out[i] = (normalizedNumber >> (8*i)) & mask;
        }*/
        return new Int8Array(out);
    }

    static decode(binary : Int8Array) : EncodableNumber{
        //let out = 0;
        //const mask = 255; //11111111

        /*const digits = EncodableNumber.getDigitCountFromBytes(binary.length);
        for(let i=0; i<binary.length; i++){
            if(i == binary.length-1) out += (binary[i]) << 8*i;
            else out += (binary[i] & mask) << 8*i;
        }
        out = parseFloat((out * (1/Math.pow(10, digits))).toPrecision(digits));*/


        return new EncodableNumber(new DataView(binary.buffer,0).getFloat64(0));
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

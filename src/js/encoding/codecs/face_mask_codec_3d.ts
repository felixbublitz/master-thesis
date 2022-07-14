import { Codec } from "./codec";
import { RenderObject } from "../../renderer/renderer";
import { FaceMesh, InputImage, NormalizedLandmarkList } from "@mediapipe/face_mesh";
import { Coordinates } from "../types";

export class FaceMaskCodec3d implements Codec{
    private readonly faceMesh : FaceMesh;
    private readonly LIBRARY_FACE_MESH =  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';
    private currentLandMarks : NormalizedLandmarkList[];
    init = false;

    constructor(){
        this.faceMesh = new FaceMesh({locateFile: (file) => {
            return this.LIBRARY_FACE_MESH + file;
          }});
    }

    startEncoding() {
        this.startFaceDetection();
    }

    private async startFaceDetection(){
        this.faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
  
        this.faceMesh.onResults((results) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks [0] != null)
            this.currentLandMarks = results.multiFaceLandmarks;
        });
  
        await this.faceMesh.initialize();
        this.init = true;
      }

    encodeFrame(videoDom : HTMLVideoElement) : Int8Array {
        if(!this.init) return;
        
        this.faceMesh.send({image: videoDom as InputImage});
        const data = new WireFrameData();

        if(this.currentLandMarks != null){
            let landmarks = this.transformLandmarks(this.currentLandMarks[0]);
            landmarks.forEach((landmark : any)=>{
              data.add({x : landmark.x, y : landmark.y, z : landmark.z} as Coordinates)
            });

        }

        return data.encodeBinary();

    }

    decodeFrame(data : Int8Array) : RenderObject {
      const out = WireFrameData.decode(data);
      return new RenderObject(out);
    }
    
    transformLandmarks = (landmarks : NormalizedLandmarkList) => {
        if (!landmarks) {
          return landmarks;
        }
      
        let hasVisiblity = !!landmarks.find(l => l.visibility);
      
        let minZ = 1e-4;
      
        // currently mediapipe facemesh js
        // has visibility set to undefined
        // so we use a heuristic to set z position of facemesh
        if (hasVisiblity) {
          landmarks.forEach(landmark => {
            let { z, visibility } = landmark;
            z = -z;
            if (z < minZ && visibility) {
              minZ = z
            }
          });
        } else {
          minZ = Math.max(-landmarks[234].z, -landmarks[454].z);
        }
       
        return landmarks.map(landmark => {
          let {x, y, z} = landmark;
          return {
            x: -0.5 + x,
            y: 0.5 - y,
            z: -z - minZ,
            visibility: landmark.visibility,
          }
        });
      }
    }




    export class WireFrameData{
      readonly data : Array<Coordinates>;
      readonly bytesPerDigit : number = 4; //must be <= 4
  
      constructor(bytesPerDigit? : number){
          this.bytesPerDigit = bytesPerDigit==null?this.bytesPerDigit:bytesPerDigit;
          this.data = new Array();
      }
  
      add(coordinates : Coordinates){
          this.data.push(coordinates);
      }
  
  
      encodeBinary() : Int8Array{
          let out = new Int8Array(3 * this.data.length * this.bytesPerDigit + 1);
  
          let sizeFieldBytes = 1;
          out[0] = this.bytesPerDigit; //size specificator
  
          for(let i=0; i<this.data.length; i+=1){
  
              let xIndex = sizeFieldBytes + 3 * i * this.bytesPerDigit;
              let yIndex = xIndex + this.bytesPerDigit;
              let zIndex = yIndex + this.bytesPerDigit;
  
              const encodedX = this.encodeNumberBinary(this.data[i].x, this.bytesPerDigit);
              const encodedY = this.encodeNumberBinary(this.data[i].y, this.bytesPerDigit);
              const encodedZ = this.encodeNumberBinary(this.data[i].z, this.bytesPerDigit);
              for(let byteIndex=0; byteIndex<this.bytesPerDigit; byteIndex++){
                  out[xIndex+byteIndex] = encodedX[byteIndex];
                  out[yIndex+byteIndex] = encodedY[byteIndex];
                  out[zIndex+byteIndex] = encodedZ[byteIndex];
              }
  
          }
  
          return out;
      }
  
      private encodeNumberBinary(number : number, bytes : number): Int8Array{
          const digits = WireFrameData.getDigitCountFromBytes(bytes);
          const normalizedNumber = Math.round(number * Math.pow(10, digits));
          const out = new Int8Array(bytes);
          const mask = 255; //111111111
          
          for(let i=0; i<bytes; i++){
              out[i] = (normalizedNumber >> 8*i) & mask;
          }
          return out;
      }
  
      private static getDigitCountFromBytes(bytes : number) : number{
          return (Math.pow(2, bytes*8)/2).toString().length - 1;
      }
  
      private static decodeNumberBinary(encoded : Int8Array) : number{
          let out = 0;
          const mask = 255; //111111111
  
          const digits = WireFrameData.getDigitCountFromBytes(encoded.length);
          for(let i=0; i<encoded.length; i++){
              if(i == encoded.length-1) out += (encoded[i]) << 8*i;
              else out += (encoded[i] & mask) << 8*i;
          }
          out = parseFloat((out * (1/Math.pow(10, digits))).toPrecision(digits));
          return out;
      }
  
      static decodeBinary(bytes : Int8Array) : WireFrameData{
          
          let out = new WireFrameData(bytes[0]); //size specificator
  
          if((bytes.length-1) % 3*out.bytesPerDigit != 0)
              throw("wrong size");
  
          for(let i=1; i<bytes.length; i+=3*out.bytesPerDigit){
              out.add({x: WireFrameData.decodeNumberBinary(bytes.slice(i, i + out.bytesPerDigit)),
                  y: WireFrameData.decodeNumberBinary(bytes.slice(i + out.bytesPerDigit, i + 2*out.bytesPerDigit)),
                  z: WireFrameData.decodeNumberBinary(bytes.slice(i + 2*out.bytesPerDigit, i + 3*out.bytesPerDigit))
              } as Coordinates);
          }
          return out;
      }
  
      static decodeString(data : string) : WireFrameData{
          let out = new WireFrameData();
          JSON.parse(data).forEach((item : Coordinates) => {
              out.add(item);
          });
          return out;
      }
  
      static decode(data : any) : WireFrameData{
          if(data instanceof Int8Array) return this.decodeBinary(data as Int8Array);
          if(typeof data === 'string') return this.decodeString(data as string);
          throw("invailid input type");
      }
  }
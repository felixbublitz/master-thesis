import { RenderObject } from "../../renderer/renderer";
import { FaceMesh, InputImage, NormalizedLandmarkList, MatrixData } from "@mediapipe/face_mesh";
import { EncodableArray, EncodableNumber } from "../types";
import { Codec } from "./codec";

export class MediapipeTranslationCodec implements Codec{
    private readonly faceMesh : FaceMesh;
    private readonly LIBRARY_FACE_MESH =  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';
    private currentMatrix : MatrixData;
    init = false;

    private PRECISION = 4;

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
          enableFaceGeometry: true,
          maxNumFaces: 1,
          refineLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
  
        this.faceMesh.onResults((results) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks [0] != null){
            this.currentMatrix = results.multiFaceGeometry[0].getPoseTransformMatrix();;
        }
        });
  
        await this.faceMesh.initialize();
        this.init = true;
      }

    encodeFrame(videoDom : HTMLVideoElement) : Int8Array {
        if(!this.init) return;
        
        this.faceMesh.send({image: videoDom as InputImage});
        const data = new EncodableArray();
        const ELEMENTS = 16;

        if(this.currentMatrix != null){
          for(let i=0; i<ELEMENTS;i++)
            data.add(new EncodableNumber(this.currentMatrix.getPackedDataList()[i]));
        }
        return data.encode(EncodableNumber, this.PRECISION);
    }

    decodeFrame(data : Int8Array) : RenderObject {
      const out = EncodableArray.decode(data, EncodableNumber, this.PRECISION);
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




   
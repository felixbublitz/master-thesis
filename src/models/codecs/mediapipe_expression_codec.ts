import { RenderObject } from "../../renderer/renderer";
import { FaceMesh, InputImage, NormalizedLandmarkList, MatrixData } from "@mediapipe/face_mesh";
import { EncodableArray, EncodableCoordinates, EncodableNumber } from "../../encoding/types";
import { Codec } from "../../encoding/codec";

export class MediapipeExpressionCodec implements Codec{
    private readonly faceMesh : FaceMesh;
    private readonly LIBRARY_FACE_MESH =  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';
    private currentMatrix : MatrixData;
    private currentLandMarks : NormalizedLandmarkList[];
    private currentVcoords : EncodableArray;

    init = false;
    private PRECISION = 8;

    private translationMatrixBinaryLength = EncodableArray.getEncodedSize(16, EncodableNumber, this.PRECISION, false);
    private landmarksBinaryLength = EncodableArray.getEncodedSize(468, EncodableCoordinates, this.PRECISION, false);

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

        this.currentVcoords = new EncodableArray();
  
        this.faceMesh.onResults((results) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks [0] != null){
            this.currentMatrix = results.multiFaceGeometry[0].getPoseTransformMatrix();
            const a = results.multiFaceGeometry[0].getMesh().getVertexBufferList();
            this.currentVcoords.empty();
            //console.log({x : a[10*5+0], y : a[10*5+1]});
            for(let i = 0; i<468; i++){
              this.currentVcoords.add(new EncodableCoordinates(a[i*5],a[i*5+1],a[i*5+2]))
            }


            this.currentLandMarks = results.multiFaceLandmarks;
        }
        });
  
        await this.faceMesh.initialize();
        this.init = true;
      }

    async encodeFrame(videoDom : HTMLVideoElement) : Promise<Int8Array> {
        if(!this.init) return;
        await this.faceMesh.send({image: videoDom as InputImage});

        const geomData = new EncodableArray();
        const landmarkData = new EncodableArray();


        const ELEMENTS = 16;


        if(this.currentMatrix != null && this.currentLandMarks != null){
          for(let i=0; i<ELEMENTS;i++){
            geomData.add(new EncodableNumber(this.currentMatrix.getPackedDataList()[i]));
          }
          let landmarks = this.transformLandmarks(this.currentLandMarks[0]);
          landmarks.forEach((landmark : any)=>{
            landmarkData.add(new EncodableCoordinates(landmark.x, landmark.y, landmark.z))
          });
        }
        const out = new Int8Array(this.landmarksBinaryLength + this.translationMatrixBinaryLength);
        out.set(geomData.encode(EncodableNumber, this.PRECISION), 0);
        out.set(this.currentVcoords.encode(EncodableCoordinates, this.PRECISION), this.translationMatrixBinaryLength)

        return out;
    }

    decodeFrame(data : Int8Array) : RenderObject {
      const geomData = EncodableArray.decode(data.slice(0, this.translationMatrixBinaryLength), EncodableNumber, this.PRECISION);
      const landmarkData = EncodableArray.decode(data.slice(this.translationMatrixBinaryLength, data.length), EncodableCoordinates, this.PRECISION);

      return new RenderObject({translation : geomData.getValue(), landmarks : landmarkData.getValue()});
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




   
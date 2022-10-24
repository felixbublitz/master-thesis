import { RenderObject } from "../../renderer/renderer";
import { FaceMesh, InputImage, NormalizedLandmarkList, MatrixData } from "@mediapipe/face_mesh";
import { Encodable2DCoordinates, EncodableArray, EncodableCoordinates, EncodableNumber } from "../../encoding/types";
import { Codec } from "../../encoding/codec";
import { Normalizer, rotateCoordinate } from "../../etc/blendshape";

export class MediapipeBlendshapeCodec implements Codec{
    private readonly faceMesh : FaceMesh;
    private readonly LIBRARY_FACE_MESH =  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';
    private alignLandmarks : EncodableArray;
    private featureLandmarks : EncodableArray;
    private PRECISION = 8;
    private alignBinaryLength = EncodableArray.getEncodedSize(5, EncodableCoordinates, this.PRECISION, false);
    private featuresBinaryLength = EncodableArray.getEncodedSize(14, Encodable2DCoordinates, this.PRECISION, false);
    private init = false;

    constructor(){
        this.faceMesh = new FaceMesh({locateFile: (file) => {
            return this.LIBRARY_FACE_MESH + file;
          }});
    }

    startEncoding() {
        this.startFaceDetection();
    }

    private async startFaceDetection(){
      this.alignLandmarks = new EncodableArray();
      this.featureLandmarks = new EncodableArray();

        this.faceMesh.setOptions({
          enableFaceGeometry: true,
          maxNumFaces: 1,
          refineLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

  
        this.faceMesh.onResults((results) => {
          this.alignLandmarks.empty();
          this.featureLandmarks.empty();

          if (results.multiFaceLandmarks && results.multiFaceLandmarks[0] != null){
            const vertexBufferList = results.multiFaceGeometry[0].getMesh().getVertexBufferList();

            let vertexBufferLandmarks = new Array<number[]>();

            for(let i=0; i<468; i++){
              vertexBufferLandmarks.push(rotateCoordinate(0, 0, vertexBufferList[i*5], vertexBufferList[i*5+1], 180));
            }

            const normalizer = new Normalizer(vertexBufferLandmarks);
            vertexBufferLandmarks = normalizer.append(vertexBufferLandmarks);

            const blendshapeCoordinates = [78,308,13,14,2,200,214,432,145,160,22,66,104,55];
            for(const coordinate of blendshapeCoordinates){
              this.featureLandmarks.add(new Encodable2DCoordinates(vertexBufferLandmarks[coordinate][0],vertexBufferLandmarks[coordinate][1]));
            }

            const alignCoordinates = [6,10,151,234,454];
            for(const coordinate of alignCoordinates){
              const transformed = this.transformLandmarks(results.multiFaceLandmarks[0]);
              this.alignLandmarks.add(new EncodableCoordinates(transformed[coordinate].x,transformed[coordinate].y, transformed[coordinate].z));
            }

        }
        });
  
        await this.faceMesh.initialize();
        this.init = true;
      }

    async encodeFrame(videoDom : HTMLVideoElement) : Promise<Int8Array> {
        if(!this.init) return;
        await this.faceMesh.send({image: videoDom as InputImage});

        const out = new Int8Array(this.alignBinaryLength + this.featuresBinaryLength);
        out.set(this.featureLandmarks.encode(Encodable2DCoordinates, this.PRECISION), 0);
        out.set(this.alignLandmarks.encode(EncodableCoordinates, this.PRECISION), this.featuresBinaryLength)
        return out;
        
    }

    decodeFrame(data : Int8Array) : RenderObject {
      const featureLandmarks = EncodableArray.decode(data.slice(0, this.featuresBinaryLength), Encodable2DCoordinates, this.PRECISION);
      const alignLandmarks = EncodableArray.decode(data.slice(this.featuresBinaryLength, data.length), EncodableCoordinates, this.PRECISION);

      return new RenderObject({align : alignLandmarks.getValue(), features : featureLandmarks.getValue()});
    }
    
    transformLandmarks = (landmarks : NormalizedLandmarkList) => {
        if (!landmarks) {
          return landmarks;
        }
      
        let hasVisiblity = !!landmarks.find(l => l.visibility);
        let minZ = 1e-4;
      
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




   
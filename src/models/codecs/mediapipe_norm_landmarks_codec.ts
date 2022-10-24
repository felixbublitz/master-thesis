import { RenderObject } from "../../renderer/renderer";
import { FaceMesh, InputImage, NormalizedLandmarkList, MatrixData } from "@mediapipe/face_mesh";
import { EncodableArray, EncodableCoordinates, EncodableNumber } from "../../encoding/types";
import { Codec } from "../../encoding/codec";

export class MediapipeNormalizedLandmarksCodec implements Codec {
  private readonly faceMesh: FaceMesh;
  private readonly LIBRARY_FACE_MESH = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';
  private currentLandmarks: EncodableArray;

  init = false;
  private PRECISION = 2;

  constructor() {
    this.faceMesh = new FaceMesh({
      locateFile: (file) => {
        return this.LIBRARY_FACE_MESH + file;
      }
    });
  }

  startEncoding() {
    this.startFaceDetection();
  }

  private async startFaceDetection() {
    this.currentLandmarks = new EncodableArray();

    this.faceMesh.setOptions({
      enableFaceGeometry: true,
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks[0] != null) {
        const vertexBufferList = results.multiFaceGeometry[0].getMesh().getVertexBufferList();
        this.currentLandmarks.empty();
        for (let i = 0; i < 468; i++) {
          this.currentLandmarks.add(new EncodableCoordinates(vertexBufferList[i * 5], vertexBufferList[i * 5 + 1], vertexBufferList[i * 5 + 2]))
        }
      }
    });

    await this.faceMesh.initialize();
    this.init = true;
  }

  async encodeFrame(videoDom: HTMLVideoElement): Promise<Int8Array> {
    if (!this.init) return;
    await this.faceMesh.send({ image: videoDom as InputImage });
    return this.currentLandmarks.encode(EncodableCoordinates, this.PRECISION)
  }

  decodeFrame(data: Int8Array): RenderObject {
    const landmarkData = EncodableArray.decode(data, EncodableCoordinates, this.PRECISION);
    return new RenderObject({ landmarks: landmarkData.getValue() });
  }

}
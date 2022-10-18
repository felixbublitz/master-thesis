import { FaceMesh, InputImage, MatrixData } from "@mediapipe/face_mesh";
import { Encoder } from "./encoding/encoder";
import { Renderer, RenderObject } from "./renderer/renderer";
import { VideoRenderModel } from "./models/renderer/video_render_model";
import{ BLENDSHAPE_REF_FACE } from "./etc/face_geom";
import { Feature, Normalizer, LandmarkView, FeatureUI, rotateCoordinate } from "./etc/blendshape";

class Extractor{
    private readonly faceMesh : FaceMesh;
    private readonly LIBRARY_FACE_MESH =  'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';
    private currentMatrix : MatrixData;
    private wireframeView : LandmarkView;
    private wireframeView2 : LandmarkView;

    domRenderer : HTMLElement = document.createElement('div');
    video : HTMLElement = document.createElement('div');
    width = 320;
    height = 320;
    public features : FeatureUI[];
    public lastPoints : number[][];
    init = false;

    constructor(){
        (window as any).app = this;

        this.faceMesh = new FaceMesh({locateFile: (file) => {
            return this.LIBRARY_FACE_MESH + file;
          }});

        this.wireframeView = new LandmarkView("Wireframe", 320,320);
        this.wireframeView2 = new LandmarkView("Wireframe2", 320,320);


        this.features = new Array();
        this.features.push(new FeatureUI("Mouth", new Feature([78,308,13,14], [2,200,214,432], BLENDSHAPE_REF_FACE), this.width, this.height, ()=>{return this.lastPoints}));
        this.features.push(new FeatureUI('Eyes', new Feature([145], [160,22], BLENDSHAPE_REF_FACE), this.width, this.height, ()=>{return this.lastPoints}));
        this.features.push(new FeatureUI('Eyebrows', new Feature([66], [104,55], BLENDSHAPE_REF_FACE), this.width, this.height, ()=>{return this.lastPoints}));
        
        this.initExtractor();
    }

    async initExtractor(){
        this.startFaceDetection();
        let encoder = new Encoder();

        const videoRenderer = new Renderer(this.video);
        videoRenderer.setRenderModel(new VideoRenderModel(this.width, this.height));
        videoRenderer.render(new RenderObject({stream: await encoder.getStream()}));

        window.setInterval(()=>{
          this.faceMesh.send({image: this.video.childNodes[0] as InputImage});
        }, 100);

        document.getElementById('features').appendChild(this.domRenderer);
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
                let landmarks = new Array();

                const vertexBuffer = results.multiFaceGeometry[0].getMesh().getVertexBufferList();
                for(let i = 0; i<468; i++){
                    landmarks.push(rotateCoordinate(0,0,vertexBuffer[i*5], vertexBuffer[i*5+1], 180));
                }

                this.extractFeatures(landmarks);
            }
        });
  
        await this.faceMesh.initialize();
        this.init = true;
    }

    extractFeatures(points : number[][]){
        //normalize extracted points
        const normalizer = new Normalizer(points);
        points = normalizer.append(points);
        this.lastPoints = points;

        this.wireframeView.addLandmarks(points, 2, 'black');
        this.wireframeView.draw();

       



        this.wireframeView2.addLandmarks( this.extractFeaturePoints(points, [9,143,199,372] ), 2, 'black');
        this.wireframeView2.draw();

        for(const feature of this.features){
            feature.update(points);
        }
    }
   
       extractFeaturePoints(points : number[][], featureConstraintIndices : number[]){
        let landmarks = [];
        let constraints = [];

        for(let i=0; i<468; i++){
            landmarks.push(points[i]);
        }
        for(const index of featureConstraintIndices){
            constraints.push(points[index]);
        }
        const normalizer = new Normalizer(constraints);
        return normalizer.append(landmarks);
    }

}



let app = new Extractor();
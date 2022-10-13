import { BLENDSHAPE_REF_FACE } from "../mediapipe/face_geom";
let numeric = require ('numeric');

export function rotateCoordinate(cx : number, cy: number, x: number, y: number, angle: number) {
    var radians = (Math.PI / 180) * angle,
    cos = Math.cos(radians),
    sin = Math.sin(radians),
    nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
    ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return [nx, ny];
}

export class FeatureUI{
    private view : LandmarkView;
    private feature : Feature;
    private blendshapeList : HTMLUListElement;

    constructor(title : string, feature : Feature, canvasWidth : number, canvasHeight : number, getCurrentLandmarks : any){
        this.view = new LandmarkView(title, canvasWidth, canvasHeight);
        this.feature = feature;
        this.feature.onBlendshapesChanged = ()=>{this.updateBlendshapeList()};
        this.addUI(getCurrentLandmarks);
    }

    private updateBlendshapeList(){
        this.blendshapeList.innerHTML = "";

        let i=0;
        for(const blendshape of this.feature.blendshapes){
            this.blendshapeList.innerHTML += "<li style='display:block'>Blendshape " + (i++) + ": " + blendshape.getValue()+"</li>";
        }
    }
    

    addUI(getPoints : any){
        this.blendshapeList = document.createElement("ul");
        let extract_blendshape = document.createElement('button');
        extract_blendshape.innerText = "extract blendshape";
        extract_blendshape.onclick = ()=> {this.feature.addBlendshape(getPoints())}
        this.blendshapeList.className = "blendshapes";
        this.blendshapeList.style.display = "block";
        this.view.appendUI(this.blendshapeList);
        this.view.appendUI(extract_blendshape)
    }

    update(points : number[][]){
        this.feature.update(points);
        this.view.addLandmarks(this.feature.canonicalValues, 4, "#aaa");
        this.view.addLandmarks(this.feature.extractFeaturePoints(points, this.feature.landmarks, this.feature.constraints), 4, "black");
        if(this.feature.hasBlendshapes()) this.view.addLandmarks(this.feature.getApproximatedPoints(), 4, "red");
        this.view.draw();
    }
}

export class Feature{
    readonly canonicalValues : number[][];
    readonly landmarks : number[];
    readonly constraints : number[];
    readonly blendshapes : Array<Blendshape>;
    onBlendshapesChanged = ()=>{};

    constructor(landmarks : number[], constraints : number[], canonicalPoints : number[][]){
        this.landmarks = landmarks;
        this.constraints = constraints;
        this.blendshapes = new Array();
        this.canonicalValues = this.extractFeaturePoints(BLENDSHAPE_REF_FACE, this.landmarks, this.constraints);
    }

    update(points : number[][]){
        if(this.hasBlendshapes()) this.estimateBlendshapeValues(points);
    }

    extractFeaturePoints(points : number[][], featureLandmarkIndices : number[], featureConstraintIndices : number[]){
        let landmarks = [];
        let constraints = [];

        for(const index of featureLandmarkIndices){
            landmarks.push(points[index]);
        }
        for(const index of featureConstraintIndices){
            constraints.push(points[index]);
        }
        const normalizer = new Normalizer(constraints);
        return normalizer.append(landmarks);
    }

    private getLandmarkDifferences(points : number[][]){
        const out = [];
        let normalizedLandmarks = this.extractFeaturePoints(points, this.landmarks, this.constraints);
        for(let i=0;i<this.landmarks.length; i++){
            out.push( normalizedLandmarks[i][0]-this.canonicalValues[i][0], normalizedLandmarks[i][1]- this.canonicalValues[i][1])
        }
        return out;
    }
    
    estimateBlendshapeValues(points : number [][]){
        let normalizedLandmarks = this.extractFeaturePoints(points, this.landmarks, this.constraints);
        const sampleVector = this.getLandmarkDifferences(points);
        const baseMatrix = [];

        for(const blendshape of this.blendshapes){
            baseMatrix.push(blendshape.getBaseVector());
        }

        const result = this.lsqlin(sampleVector, numeric.transpose(baseMatrix));

        let i=0;
        for(const blendshape of this.blendshapes){
            blendshape.setValue(result[i++])
        }

        this.onBlendshapesChanged();
    }

    private lsqlin(sampleVector : number[], baseMatrix : number[][]){
        const Dmat = numeric.dot(numeric.transpose(baseMatrix),baseMatrix);
        const dvec = numeric.dot(numeric.transpose(baseMatrix), sampleVector);
        const Amat = sampleVector;
        return numeric.solveQP(Dmat,dvec,Amat).unconstrained_solution;
    }

    hasBlendshapes(){
        return this.blendshapes.length==0?false:true;
    }

    addBlendshape(points : number[][]){
        let normalizedLandmarks = this.extractFeaturePoints(points, this.landmarks, this.constraints);

        const blendshape = new Blendshape();
        for(let i=0; i<this.landmarks.length; i++){
            blendshape.addCoordinate(normalizedLandmarks[i][0]-this.canonicalValues[i][0], normalizedLandmarks[i][1]-this.canonicalValues[i][1])
        }
        this.blendshapes.push(blendshape);
        this.onBlendshapesChanged();
    }

    getApproximatedPoints() : number[][]{
        const coords = [];
        const points = [];
        for(const blendshape of this.blendshapes){
            coords.push(blendshape.getTransformedCoordinates());
        }

        for(let i=0; i<this.landmarks.length; i++){
            let x = 0;
            let y = 0;
            for(let j=0; j<this.blendshapes.length; j++){
                x +=coords[j][i][0];
                y +=coords[j][i][1];
            }
            points.push([this.canonicalValues[i][0]+x,this.canonicalValues[i][1]+y]);
        }
        return points;
    }
}

export class Blendshape{
    private value = 0;
    private baseVector : number[];

    constructor(){
        this.baseVector = new Array();
    }

    getBaseVector(){
        return this.baseVector;
    }

    getTransformedCoordinates() : number[][]{
        const coords = [];
        for(let i=0; i<this.baseVector.length;i+=2){
            coords.push([this.value * this.baseVector[i], this.value * this.baseVector[i+1]])
        }
        return coords;
    }

    addCoordinate(x : number, y: number) : Blendshape{
        this.baseVector.push(x,y);
        return this;
    }

    setValue(value : number){
        this.value = Math.round(100*(Math.min(1,Math.max(0,value)))) /100;
    }

    getValue(){return this.value};
}


export class LandmarkView{
    private title ="";
    private landmarkSets : LandmarkView.LandmarkSet[];
    private width : number;
    private height : number;

    constructor(title : string, width : number, height : number){
        this.title = title;
        this.width = width;
        this.height = height;
        this.landmarkSets = new Array();
        this.getDomElement(); //create dom
    }

    private getDomElement() : HTMLElement{
        let element = document.getElementById('feature-'+ this.title);
        if(element != null) return element;

        let container = document.createElement('div');
        let descriptor = document.createElement('p');
        
        descriptor.innerText = this.title;
        const canvas = document.createElement('canvas');
        canvas.style.border = "1px solid";
        canvas.width = this.width;
        container.id = "feature-" + this.title;
        canvas.height = this.height;
        canvas.style.display = "block";
        canvas.getContext("2d").clearRect(0,0, canvas.width, canvas.height);
        container.appendChild(descriptor);
        container.appendChild(canvas); 

        document.getElementById('features').appendChild(container);
        return container;
    }

    appendUI(uiDom : HTMLElement){
        this.getDomElement().append(uiDom);
    }

    private getCanvas() : HTMLCanvasElement{
        return this.getDomElement().getElementsByTagName('canvas')[0] as HTMLCanvasElement;
      }

    
    addLandmarks(landmarks : number[][], weight?:number, color?:string){
        this.landmarkSets.push(new LandmarkView.LandmarkSet(color, weight, landmarks));
    }

    private drawRelativePoints(canvas : HTMLCanvasElement, points : number[][], color?:string, weight? : number){
        let context = canvas.getContext('2d');
        if(weight==0) weight=4;

        context.save();
        if(color) context.fillStyle = color;

        for(const point of points){
            context.fillRect(point[0]*canvas.width, point[1]*canvas.height, weight, weight);
        }
        context.restore();
    }


    draw(){
        let canvas = this.getCanvas();
        canvas.getContext('2d').clearRect(0,0, canvas.width, canvas.height);

        for(const landmarkSet of this.landmarkSets){
            this.drawRelativePoints(canvas, landmarkSet.landmarks, landmarkSet.color, landmarkSet.weight);
        }
        this.landmarkSets = [];
    
    }
}

export namespace LandmarkView{
    export class LandmarkSet{
        color : string;
        weight : number;
        landmarks: number[][];

        constructor(color : string, weight : number, landmarks: number[][]){
            this.color = color;
            this.weight = weight;
            this.landmarks = landmarks;
        }
    }
}

export class Normalizer{
    private min = [10,10];
    private max = [0,0];
    private scaleX = 1;
    private scaleY = 1;

    constructor(points : number[][]){
        for(let i=0; i<points.length;i++){
            if(points[i][0] < this.min[0]) this.min[0] = points[i][0];
            if(points[i][1] < this.min[1]) this.min[1] = points[i][1];
            if(points[i][0] > this.max[0]) this.max[0] = points[i][0];
            if(points[i][1] > this.max[1]) this.max[1] = points[i][1];
        }
        this.scaleX = this.max[0] - this.min[0];
        this.scaleY = this.max[1] - this.min[1];
    }
         
    append( points : number[][]){
        let out = [...points];

        for(let i=0; i<points.length;i++){
            out[i] = [(points[i][0] - this.min[0]) / this.scaleX, (points[i][1] -this.min[1]) / this.scaleY ];
        }
        return out;
      }
}
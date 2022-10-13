const Homography = require("homography/Homography");

const PNG = require('pngjs').PNG;


export class TextureExtractor{
  
  extact(){
    const image = new Image();
    image.onload = ()=>{
      const srcPoints = [[0, 0], [0, 1], [1, 0], [1, 1]];
      const dstPoints = [[1/5, 1/5], [0, 1/2], [1, 0], [6/8, 6/8]];
      const myHomography = new Homography.Homography("piecewiseaffine");
      myHomography.setReferencePoints(srcPoints, dstPoints);
      const resultImage = myHomography.warp(image);

      const c = document.createElement('canvas');
      const img = new ImageData(resultImage.width, resultImage.height);
      img.data.set(resultImage.data);

      let dom : HTMLImageElement;
      
      myHomography.HTMLImageElementFromImageData(img, true).then((res:any,rej:any)=>{
        document.body.appendChild(res);
      });
    }
    image.src = '../assets/WIN_20220714_17_16_51_Pro.jpg';
  
  }

}
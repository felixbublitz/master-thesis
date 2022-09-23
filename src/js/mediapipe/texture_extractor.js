import { Homography, loadImage } from "homography";
const PNG = require('pngjs').PNG;


export class TextureExtractor{

    extact(){
    const image = new Image();
    const image2 = new Image();

    document.body.appendChild(image2);

    

    image.onload = ()=>{
        const srcPoints = [[0, 0], [0, 1], [1, 0], [1, 1]];
        const dstPoints = [[1/5, 1/5], [0, 1/2], [1, 0], [6/8, 6/8]];
        const myHomography = new Homography("piecewiseaffine");
        myHomography.setReferencePoints(srcPoints, dstPoints);
        console.log(image);
        const resultImage = myHomography.warp(image);

        const k = new PNG({ filterType: 4 }).parse(resultImage.data, function (error, data) {
            console.log(error, data);
          });

  

          console.log(k);
        //Buffer.from(str, 'base64') andbuf.toString('base64').

        const c = document.createElement('canvas');
        document.body.appendChild(c);

        c.getContext("2d").putImageData(k, 0, 0);


       
    }
    image.src = '../assets/testImgLogoBlack.png';


    
   
    }


}
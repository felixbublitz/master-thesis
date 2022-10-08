import * as THREE from 'three';

export class Helper{

    static scaleLandmarks(landmarks: Array<any>, width: any, height: any){
        const out = Array<any>();
    
        for(let i=0; i<landmarks.length; i++){
          let { x, y, z } = landmarks[i];
          let highest = Math.max(width, height);
          out.push({x : (x * width)/highest, y: (y * height)/highest, z: (z * width)/highest});
        }
    
        return out;
      }

    static getTranslation(landmarks : Array<any>){
        const nose = landmarks[6];// nose bottom
        return new THREE.Vector3(nose.x*320, nose.y*180, nose.z);
      }
  
      static getScale(landmarks : Array<any>){
        const left = landmarks[234];
        const right = landmarks[454];
        return Math.sqrt((right.x - left.x)**2 + (right.y-left.y)**2 + (right.z-left.z)**2);
      }


      static getDistance(landmark1 : any, landmark2 : any){
        return Math.sqrt((landmark1.x - landmark2.x)**2 + (landmark1.y-landmark2.y)**2 + (landmark1.z-landmark2.z)**2);
      }
    
    
      static getRotation = (landmarks : Array<any>) => {
        const nose = landmarks[6];// nose bottom
        const top = landmarks[10];
        const top2 = landmarks[151];// nose bottom
        const left = landmarks[234];
        const right = landmarks[454];
    
        const rotationX = new THREE.Quaternion();
        const rotationZ = new THREE.Quaternion();
        const rotationY = new THREE.Quaternion();
        rotationZ.setFromUnitVectors(new THREE.Vector3(0,1,0), new THREE.Vector3(top.x-nose.x,top.y-nose.y,0).normalize());
        rotationY.setFromUnitVectors(new THREE.Vector3(-1,0,0), new THREE.Vector3(left.x-right.x,0,left.z-right.z).normalize());
        rotationX.setFromUnitVectors(new THREE.Vector3(0,1,0), new THREE.Vector3(0,top.y-top2.y,top.z-top2.z).normalize());
        
        return rotationX.multiply(rotationY.multiply(rotationZ));
        
       /* const q1 = new THREE.Quaternion();
        const q2 = new THREE.Quaternion();
        const q3 = new THREE.Quaternion();
        const rotA = new THREE.Vector3(0,mouth4.y-mouth2.y,mouth4.z-mouth2.z).normalize();
        const rotC = new THREE.Vector3(0,mouth8.y-mouth6.y,mouth8.z-mouth6.z).normalize();
  
        const mouth2 = this.scaleLandmark(landmarks[200], 1920, 1080);// nose bottom
        const mouth4 = this.scaleLandmark(landmarks[18], 1920, 1080);// nose bottom
        const mouth6 = this.scaleLandmark(landmarks[0], 1920, 1080);// nose bottom
        const mouth8 = this.scaleLandmark(landmarks[2], 1920, 1080);// nose bottom
        q1.setFromUnitVectors(vert, rotA);
        q2.setFromUnitVectors(vert, rotB);
        q3.setFromUnitVectors(vert, rotC);
  
  
        rotationX.w = 0.33 * q1.w + 0.33 * q2.w + 0.33 * q3.w;
        rotationX.x = 0.33 * q1.x + 0.33 * q2.x + 0.33 * q3.x;
        rotationX.y = 0.33 * q1.y + 0.33 * q2.y + 0.33 * q3.y;
        rotationX.z = 0.33 * q1.z + 0.33 * q2.z + 0.33 * q3.z;*/
        }
        
}
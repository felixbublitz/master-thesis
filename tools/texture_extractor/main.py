import matplotlib.pyplot as plt
import os
import json
import cv2
import numpy as np
import mediapipe as mp
import skimage
from skimage.transform import PiecewiseAffineTransform, warp

LANDMARK_COUNT = 468;
TEXTURE_WIDTH, TEXTURE_HEIGHT = 512,512

def load_uv(path, width, height):
    data = json.load(open(path))
    uv_map = np.array([ (data["u"][str(i)],data["v"][str(i)]) for i in range(LANDMARK_COUNT)])
    return np.array([(width*x, height*y) for x,y in uv_map])

def get_landmarks(image):
    with mp.solutions.face_mesh.FaceMesh(static_image_mode=True,refine_landmarks=True,max_num_faces=1,min_detection_confidence=0.5) as face_mesh:
        result = face_mesh.process(image);
        if len(result.multi_face_landmarks)!=1:
            return None;
        landmarks = result.multi_face_landmarks[0]
        height,width,_ = input_image.shape
        absoluteLandmarks = np.array([(width*point.x,height*point.y) for point in landmarks.landmark[0:LANDMARK_COUNT]])
        return absoluteLandmarks

def affine_transform(image, source_landmarks, target_landmarks, output_width, output_heiht):
    tform = PiecewiseAffineTransform()
    tform.estimate(target_landmarks, source_landmarks)
    texture = warp(image, tform, output_shape=(output_heiht,output_width))
    return (255*texture).astype(np.uint8)

input_image = skimage.io.imread('./input.jpg')
landmarks_uv = load_uv('./uv_map.json', TEXTURE_WIDTH, TEXTURE_HEIGHT)
landmarks = get_landmarks(input_image);

if landmarks is not None:
    texture = affine_transform(input_image, landmarks, landmarks_uv, TEXTURE_WIDTH, TEXTURE_HEIGHT)
    skimage.io.imsave('./texture.jpg', texture)
else:
    print("Could not estimate landmarks")
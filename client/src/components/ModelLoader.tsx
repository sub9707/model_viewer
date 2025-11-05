import React, { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Model } from '../types/model';
import { FBXLoader, MTLLoader, OBJLoader, STLLoader } from 'three/examples/jsm/Addons.js';

interface ModelLoaderProps {
  model: Model;
  onError: (error: string) => void;
}

const ModelLoader: React.FC<ModelLoaderProps> = ({ model, onError }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [loadedModel, setLoadedModel] = useState<THREE.Object3D | null>(null);
  const { camera } = useThree();

  const modelUrl = `http://localhost:8000${model.modelFile.path}`;
  const fileExtension = model.modelFile.filename.split('.').pop()?.toLowerCase();
  const baseUrl = `http://localhost:8000/uploads/${model.id}/`;

  useEffect(() => {
    const loadModel = async () => {
      try {
        let object: THREE.Object3D | null = null;

        switch (fileExtension) {
          case 'gltf':
          case 'glb':
            // GLTFLoader는 useGLTF 훅 사용
            break;

          case 'obj':
            // MTL 파일 찾기 (확장자 또는 OBJ와 같은 이름)
            const objBaseName = model.modelFile.filename.replace(/\.obj$/i, '');
            const mtlFile = model.textures.find(t => 
              t.filename.toLowerCase().endsWith('.mtl') ||
              t.filename.toLowerCase() === `${objBaseName.toLowerCase()}.mtl`
            );

            console.log('Loading OBJ model:', modelUrl);
            console.log('Available textures:', model.textures.map(t => t.filename));
            console.log('MTL file found:', mtlFile?.filename || 'None');

            if (mtlFile) {
              // MTL 파일이 있는 경우 - 텍스처와 함께 로드
              const mtlUrl = `http://localhost:8000${mtlFile.path}`;
              
              console.log('Loading MTL from:', mtlUrl);
              
              // LoadingManager 생성 - 텍스처 경로 리다이렉션
              const loadingManager = new THREE.LoadingManager();
              
              loadingManager.setURLModifier((url) => {
                console.log('Resolving texture URL:', url);
                
                // 상대 경로를 절대 경로로 변환
                if (!url.startsWith('http')) {
                  // MTL 파일의 폴더 경로 기준으로 텍스처 경로 해결
                  const mtlFolder = mtlFile.folderPath 
                    ? `textures/${mtlFile.folderPath}/` 
                    : 'textures/';
                  
                  // 파일명만 추출
                  const filename = url.split('/').pop() || url;
                  
                  // 텍스처 파일 찾기
                  const textureFile = model.textures.find(t => 
                    t.filename.toLowerCase() === filename.toLowerCase()
                  );
                  
                  if (textureFile) {
                    const resolvedUrl = `http://localhost:8000${textureFile.path}`;
                    console.log(`✓ Texture found: ${filename} -> ${resolvedUrl}`);
                    return resolvedUrl;
                  }
                  
                  // 찾지 못한 경우 기본 경로 시도
                  const fallbackUrl = `${baseUrl}${mtlFolder}${filename}`;
                  console.log(`⚠ Texture not in list, trying: ${fallbackUrl}`);
                  return fallbackUrl;
                }
                return url;
              });

              const mtlLoader = new MTLLoader(loadingManager);
              const materials = await mtlLoader.loadAsync(mtlUrl);
              materials.preload();

              console.log('MTL loaded successfully, loading OBJ...');

              const objLoader = new OBJLoader(loadingManager);
              objLoader.setMaterials(materials);
              object = await objLoader.loadAsync(modelUrl);
              
              console.log('OBJ loaded successfully with materials');
            } else {
              console.warn('No MTL file found, loading OBJ and applying textures automatically');
              
              // MTL 파일이 없는 경우
              const objLoader = new OBJLoader();
              object = await objLoader.loadAsync(modelUrl);
              
              // 이미지 텍스처 파일 찾기
              const imageTextures = model.textures.filter(t => 
                /\.(jpg|jpeg|png|gif|bmp|tga)$/i.test(t.filename)
              );
              
              console.log('Found image textures:', imageTextures.map(t => t.filename));
              
              if (imageTextures.length > 0) {
                // 텍스처 로더
                const textureLoader = new THREE.TextureLoader();
                
                // 첫 번째 이미지를 diffuse 맵으로 사용
                const mainTextureUrl = `http://localhost:8000${imageTextures[0].path}`;
                console.log('Loading main texture:', mainTextureUrl);
                
                try {
                  const texture = await textureLoader.loadAsync(mainTextureUrl);
                  
                  // 텍스처 설정
                  texture.colorSpace = THREE.SRGBColorSpace;
                  texture.wrapS = THREE.RepeatWrapping;
                  texture.wrapT = THREE.RepeatWrapping;
                  texture.flipY = true; // OBJ 파일은 보통 Y축 반전 필요
                  
                  console.log('Texture loaded successfully:', {
                    width: texture.image.width,
                    height: texture.image.height,
                    format: texture.format
                  });
                  
                  // 모든 메시에 텍스처 적용
                  let meshCount = 0;
                  let meshWithUV = 0;
                  
                  object.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                      const mesh = child as THREE.Mesh;
                      meshCount++;
                      
                      // UV 좌표 확인
                      const geometry = mesh.geometry;
                      const hasUV = geometry.attributes.uv !== undefined;
                      
                      if (hasUV) {
                        meshWithUV++;
                        console.log(`Mesh ${mesh.name} has UV coordinates`);
                      } else {
                        console.warn(`⚠️ Mesh ${mesh.name} has NO UV coordinates - texture won't display properly`);
                      }
                      
                      // 재질 생성 및 적용
                      mesh.material = new THREE.MeshStandardMaterial({
                        map: hasUV ? texture : null,
                        color: hasUV ? 0xffffff : 0x888888,
                        metalness: 0.2,
                        roughness: 0.6,
                        side: THREE.DoubleSide,
                      });
                      
                      console.log(`Applied texture to mesh: ${mesh.name} (UV: ${hasUV})`);
                    }
                  });
                  
                  console.log(`✓ Texture applied to ${meshWithUV}/${meshCount} meshes with UV coordinates`);
                  
                  if (meshWithUV === 0) {
                    console.error('❌ No meshes have UV coordinates! Texture cannot be displayed.');
                    console.log('💡 Tip: Re-export your OBJ file with UV mapping enabled in your 3D software.');
                  }
                } catch (error) {
                  console.error('Failed to load texture:', error);
                }
              } else {
                // 텍스처가 없으면 기본 재질
                object.traverse((child) => {
                  if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.material = new THREE.MeshStandardMaterial({
                      color: 0xcccccc,
                      metalness: 0.2,
                      roughness: 0.6,
                    });
                  }
                });
                console.log('No textures found, using default material');
              }
            }
            break;

          case 'fbx':
            const fbxLoader = new FBXLoader();
            object = await fbxLoader.loadAsync(modelUrl);
            break;

          case 'stl':
            const stlLoader = new STLLoader();
            const geometry = await stlLoader.loadAsync(modelUrl);
            const material = new THREE.MeshStandardMaterial({ 
              color: 0x888888,
              metalness: 0.3,
              roughness: 0.4,
            });
            object = new THREE.Mesh(geometry, material);
            break;

          default:
            onError(`지원하지 않는 파일 형식입니다: .${fileExtension}`);
            return;
        }

        if (object) {
          // 모델 중앙 정렬 및 크기 조정
          const box = new THREE.Box3().setFromObject(object);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 5 / maxDim;
          
          object.position.sub(center);
          object.scale.multiplyScalar(scale);
          
          // 그림자 설정
          object.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          setLoadedModel(object);
          
          // 카메라 위치 조정
          const distance = maxDim * scale * 2;
          camera.position.set(distance, distance, distance);
          camera.lookAt(0, 0, 0);
        }
      } catch (error) {
        console.error('Model loading error:', error);
        onError(`모델 로딩 중 오류가 발생했습니다: ${error}`);
      }
    };

    if (fileExtension !== 'gltf' && fileExtension !== 'glb') {
      loadModel();
    }
  }, [modelUrl, fileExtension, onError, camera, model.textures, model.id, baseUrl]);

  // GLTF/GLB 파일 처리
  if (fileExtension === 'gltf' || fileExtension === 'glb') {
    try {
      const { scene } = useGLTF(modelUrl);
      
      useEffect(() => {
        if (scene) {
          const box = new THREE.Box3().setFromObject(scene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 5 / maxDim;
          
          scene.position.sub(center);
          scene.scale.setScalar(scale);
          
          scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          const distance = maxDim * scale * 2;
          camera.position.set(distance, distance, distance);
          camera.lookAt(0, 0, 0);
        }
      }, [scene, camera]);

      return <primitive object={scene} ref={groupRef} />;
    } catch (error) {
      onError(`GLTF/GLB 로딩 실패: ${error}`);
      return null;
    }
  }

  // 기타 포맷 렌더링
  return loadedModel ? <primitive object={loadedModel} ref={groupRef} /> : null;
};

export default ModelLoader;
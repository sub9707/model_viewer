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
            console.log('=== OBJ Loading Start ===');
            console.log('Model URL:', modelUrl);
            console.log('Model data:', model);
            
            // ✅ MTL 파일을 model.mtlFile에서 먼저 확인
            let mtlFile = model.mtlFile;
            
            // mtlFile 필드가 없으면 textures 배열에서 찾기
            if (!mtlFile) {
              const objBaseName = model.modelFile.filename.replace(/\.obj$/i, '');
              mtlFile = model.textures.find(t => 
                t.filename.toLowerCase().endsWith('.mtl') ||
                t.filename.toLowerCase() === `${objBaseName.toLowerCase()}.mtl`
              ) || null;
            }

            console.log('MTL file:', mtlFile ? mtlFile.filename : 'None');

            if (mtlFile) {
              // MTL 파일이 있는 경우 - MTL 내용을 수정하여 사용
              const mtlUrl = `http://localhost:8000${mtlFile.path}`;
              console.log('Loading MTL from:', mtlUrl);
              
              try {
                // ✅ MTL 파일 내용을 먼저 가져와서 경로 수정
                const mtlResponse = await fetch(mtlUrl);
                const mtlText = await mtlResponse.text();
                
                console.log('Original MTL sample (first 1000 chars):');
                console.log(mtlText.substring(0, 1000));
                console.log('---');
                
                let fixedCount = 0;
                
                // MTL 파일의 경로를 수정 (폴더 경로 제거하고 절대 경로로 변경)
                const fixedMtlText = mtlText.split('\n').map(line => {
                  const trimmedLine = line.trim();
                  
                  // map_으로 시작하는 모든 텍스처 라인 처리
                  if (trimmedLine.startsWith('map_')) {
                    console.log(`Processing line: "${trimmedLine}"`);
                    
                    // 공백으로 분리 (map_Kd 농심KBO/file.png)
                    const parts = trimmedLine.split(/\s+/);
                    
                    if (parts.length >= 2) {
                      const mapType = parts[0]; // map_Kd, map_Ks, etc.
                      const originalPath = parts.slice(1).join(' '); // 나머지는 경로
                      
                      console.log(`  Map type: ${mapType}, Path: ${originalPath}`);
                      
                      // 경로에서 파일명만 추출
                      const filename = originalPath
                        .split('/').pop()
                        ?.split('\\').pop()
                        ?.trim() || originalPath;
                      
                      console.log(`  Extracted filename: ${filename}`);
                      
                      // 텍스처 파일 찾기
                      const textureFile = model.textures.find(t => 
                        t.filename.toLowerCase() === filename.toLowerCase()
                      );
                      
                      if (textureFile) {
                        const newPath = `http://localhost:8000${textureFile.path}`;
                        const newLine = `${mapType} ${newPath}`;
                        fixedCount++;
                        console.log(`  ✓ Fixed: ${filename} -> ${newPath}`);
                        return newLine;
                      } else {
                        console.warn(`  ⚠ Texture not found: ${filename}`);
                        console.log(`  Available textures:`, model.textures.map(t => t.filename));
                      }
                    }
                  }
                  return line; // 원본 그대로 반환
                }).join('\n');
                
                console.log(`\n✓ Fixed ${fixedCount} texture paths`);
                console.log('Fixed MTL sample (first 1000 chars):');
                console.log(fixedMtlText.substring(0, 1000));
                console.log('---');
                
                // Blob으로 변환하여 새 URL 생성
                const mtlBlob = new Blob([fixedMtlText], { type: 'text/plain' });
                const fixedMtlUrl = URL.createObjectURL(mtlBlob);
                
                console.log('✓ MTL paths fixed, loading materials...');
                
                // LoadingManager 생성
                const loadingManager = new THREE.LoadingManager();
                
                loadingManager.onProgress = (url, loaded, total) => {
                  if (!url.startsWith('blob:')) {
                    console.log(`  Loading texture: ${url.split('/').pop()} (${loaded}/${total})`);
                  }
                };

                loadingManager.onError = (url) => {
                  console.error(`  ❌ Failed: ${url}`);
                };
                
                const mtlLoader = new MTLLoader(loadingManager);
                const materials = await mtlLoader.loadAsync(fixedMtlUrl);
                
                // Blob URL 정리
                URL.revokeObjectURL(fixedMtlUrl);
                
                // ✅ 재질 전처리 - 투명도 및 양면 렌더링 설정
                console.log('Processing materials...');
                materials.preload();
                
                // 모든 재질에 대해 설정 개선
                Object.keys(materials.materials).forEach(key => {
                  const material = materials.materials[key] as THREE.MeshPhongMaterial;
                  
                  // 양면 렌더링
                  material.side = THREE.DoubleSide;
                  
                  // 투명도 처리
                  if (material.opacity < 1 || material.transparent) {
                    material.transparent = true;
                    material.depthWrite = false;
                  }
                  
                  // 텍스처가 있으면 색상을 흰색으로
                  if (material.map) {
                    material.color = new THREE.Color(0xffffff);
                  }
                });

                console.log('✓ MTL loaded and preprocessed');

                const objLoader = new OBJLoader(loadingManager);
                objLoader.setMaterials(materials);
                object = await objLoader.loadAsync(modelUrl);
                
                console.log('✓ OBJ loaded with materials');
                
              } catch (error) {
                console.error('Failed to load MTL:', error);
                // MTL 로딩 실패 시 기본 재질로 로드
                const objLoader = new OBJLoader();
                object = await objLoader.loadAsync(modelUrl);
                console.warn('⚠ Loaded OBJ without materials');
              }
              
              // 로드된 객체 정보 요약
              if (object) {
                let meshCount = 0;
                let materialCount = 0;
                let totalVertices = 0;
                let meshWithUV = 0;
                
                object.traverse((child) => {
                  if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    meshCount++;
                    totalVertices += mesh.geometry.attributes.position.count;
                    
                    if (mesh.geometry.attributes.uv !== undefined) {
                      meshWithUV++;
                    }
                    
                    // 재질 개수 카운트
                    if (Array.isArray(mesh.material)) {
                      materialCount += mesh.material.length;
                    } else {
                      materialCount++;
                    }
                  }
                });
                
                console.log(`✓ Model Summary: ${meshCount} meshes (${meshWithUV} with UV), ${totalVertices.toLocaleString()} vertices, ${materialCount} materials`);
              }
              
            } else {
              // MTL 파일이 없는 경우
              console.warn('⚠ No MTL file, applying textures manually');
              
              const objLoader = new OBJLoader();
              object = await objLoader.loadAsync(modelUrl);
              
              const imageTextures = model.textures.filter(t => 
                /\.(jpg|jpeg|png|gif|bmp|tga)$/i.test(t.filename)
              );
              
              if (imageTextures.length > 0) {
                const textureLoader = new THREE.TextureLoader();
                const mainTextureUrl = `http://localhost:8000${imageTextures[0].path}`;
                
                try {
                  const texture = await textureLoader.loadAsync(mainTextureUrl);
                  texture.colorSpace = THREE.SRGBColorSpace;
                  texture.wrapS = THREE.RepeatWrapping;
                  texture.wrapT = THREE.RepeatWrapping;
                  texture.flipY = true;
                  
                  object.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                      const mesh = child as THREE.Mesh;
                      const hasUV = mesh.geometry.attributes.uv !== undefined;
                      
                      mesh.material = new THREE.MeshStandardMaterial({
                        map: hasUV ? texture : null,
                        color: 0xffffff,
                        metalness: 0.2,
                        roughness: 0.6,
                        side: THREE.DoubleSide,
                      });
                    }
                  });
                  
                  console.log('✓ Texture applied');
                } catch (error) {
                  console.error('Texture loading failed:', error);
                }
              } else {
                // 기본 재질
                object.traverse((child) => {
                  if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.material = new THREE.MeshStandardMaterial({
                      color: 0xcccccc,
                      metalness: 0.2,
                      roughness: 0.6,
                      side: THREE.DoubleSide,
                    });
                  }
                });
              }
            }
            break;

          case 'fbx':
            const fbxLoader = new FBXLoader();
            object = await fbxLoader.loadAsync(modelUrl);
            
            // FBX 재질 개선
            object.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                if (mesh.material) {
                  if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(mat => {
                      if (mat instanceof THREE.MeshStandardMaterial) {
                        mat.side = THREE.DoubleSide;
                      }
                    });
                  } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
                    mesh.material.side = THREE.DoubleSide;
                  }
                }
              }
            });
            break;

          case 'stl':
            const stlLoader = new STLLoader();
            const geometry = await stlLoader.loadAsync(modelUrl);
            
            // STL은 법선 자동 계산
            geometry.computeVertexNormals();
            
            const material = new THREE.MeshStandardMaterial({ 
              color: 0x888888,
              metalness: 0.3,
              roughness: 0.4,
              side: THREE.DoubleSide,
            });
            object = new THREE.Mesh(geometry, material);
            break;

          default:
            onError(`지원하지 않는 파일 형식입니다: .${fileExtension}`);
            return;
        }

        if (object) {
          // 법선 벡터 확인 및 재계산
          object.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              
              // 법선이 없으면 계산
              if (!mesh.geometry.attributes.normal) {
                console.log(`Computing normals for mesh: ${mesh.name}`);
                mesh.geometry.computeVertexNormals();
              }
              
              // 그림자 설정
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
          });

          // ✅ 모델 정렬: 바닥을 Y=0에, X/Z는 중심에
          const box = new THREE.Box3().setFromObject(object);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          console.log('Model bounds before alignment:', {
            min: box.min,
            max: box.max,
            center: center,
            size: size
          });
          
          // 크기 정규화 (가장 큰 차원을 5 단위로)
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 5 / maxDim;
          
          // 1. 먼저 스케일 적용
          object.scale.setScalar(scale);
          
          // 2. 스케일 적용 후 다시 바운딩 박스 계산
          box.setFromObject(object);
          const scaledCenter = box.getCenter(new THREE.Vector3());
          const scaledMin = box.min;
          
          // 3. X, Z는 중심에, Y는 바닥이 0에 오도록 이동
          object.position.set(
            -scaledCenter.x,  // X 중심
            -scaledMin.y,     // Y 바닥을 0으로
            -scaledCenter.z   // Z 중심
          );
          
          console.log('Model aligned - bottom at Y=0:', {
            position: object.position,
            scale: object.scale,
            finalBounds: new THREE.Box3().setFromObject(object)
          });

          setLoadedModel(object);
          
          // 카메라 위치 조정 - 모델 바닥이 Y=0이므로 높이 고려
          const distance = 5 * 2; // 정규화된 크기(5)의 2배 거리
          camera.position.set(distance, distance * 0.7, distance);
          camera.lookAt(0, 2.5, 0); // 모델 중간 높이 바라보기
          
          console.log('=== OBJ Loading Complete ===');
        }
      } catch (error) {
        console.error('Model loading error:', error);
        onError(`모델 로딩 중 오류가 발생했습니다: ${error}`);
      }
    };

    if (fileExtension !== 'gltf' && fileExtension !== 'glb') {
      loadModel();
    }
  }, [modelUrl, fileExtension, onError, camera, model, baseUrl]);

  // GLTF/GLB 파일 처리
  if (fileExtension === 'gltf' || fileExtension === 'glb') {
    try {
      const { scene } = useGLTF(modelUrl);
      
      useEffect(() => {
        if (scene) {
          // GLTF/GLB도 양면 렌더링 적용
          scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              
              if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach(mat => {
                    if (mat instanceof THREE.MeshStandardMaterial) {
                      mat.side = THREE.DoubleSide;
                    }
                  });
                } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
                  mesh.material.side = THREE.DoubleSide;
                }
              }
              
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
          });

          // ✅ 모델 정렬: 바닥을 Y=0에, X/Z는 중심에
          const box = new THREE.Box3().setFromObject(scene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 5 / maxDim;
          
          // 1. 스케일 적용
          scene.scale.setScalar(scale);
          
          // 2. 스케일 적용 후 다시 계산
          box.setFromObject(scene);
          const scaledCenter = box.getCenter(new THREE.Vector3());
          const scaledMin = box.min;
          
          // 3. X, Z는 중심에, Y는 바닥이 0에 오도록 이동
          scene.position.set(
            -scaledCenter.x,  // X 중심
            -scaledMin.y,     // Y 바닥을 0으로
            -scaledCenter.z   // Z 중심
          );

          const distance = 5 * 2;
          camera.position.set(distance, distance * 0.7, distance);
          camera.lookAt(0, 2.5, 0); // 모델 중간 높이 바라보기
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
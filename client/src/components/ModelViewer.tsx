import React, { Suspense, useRef, useState, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, useProgress, Html, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { Model } from '../types/model';
import ModelLoader from './ModelLoader';
import FirstPersonController from './FirstPersonController';

interface ModelViewerProps {
  model: Model;
}

// 로딩 컴포넌트
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{
        color: 'white',
        fontSize: '14px',
        background: 'rgba(0,0,0,0.8)',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div>모델 로딩 중...</div>
        <div style={{ marginTop: '10px', fontSize: '18px', fontWeight: 'bold' }}>
          {progress.toFixed(0)}%
        </div>
      </div>
    </Html>
  );
}

// 바닥 텍스처 타입
type GroundTextureType = 'grass' | 'asphalt' | 'dirt' | 'pavement' | 'marble';

interface GroundTextureConfig {
  name: string;
  textureUrl: string;      // Color 텍스처 (.webp)
  normalMapUrl: string;    // Normal 맵 (.png)
  roughness: number;
  metalness: number;
  emoji: string;
}

const GROUND_TEXTURES: Record<GroundTextureType, GroundTextureConfig> = {
  grass: {
    name: '잔디',
    textureUrl: '/textures/grass.webp',
    normalMapUrl: '/textures/grass_normal.png',
    roughness: 0.9,
    metalness: 0,
    emoji: '🌱'
  },
  asphalt: {
    name: '아스팔트',
    textureUrl: '/textures/asphalt.webp',
    normalMapUrl: '/textures/asphalt_normal.png',
    roughness: 0.8,
    metalness: 0.1,
    emoji: '🛣️'
  },
  dirt: {
    name: '흙',
    textureUrl: '/textures/dirt.webp',
    normalMapUrl: '/textures/dirt_normal.png',
    roughness: 0.95,
    metalness: 0,
    emoji: '🟤'
  },
  pavement: {
    name: '보도블럭',
    textureUrl: '/textures/pavement.webp',
    normalMapUrl: '/textures/pavement_normal.png',
    roughness: 0.7,
    metalness: 0.1,
    emoji: '⬛'
  },
  marble: {
    name: '대리석',
    textureUrl: '/textures/marble.webp',
    normalMapUrl: '/textures/marble_normal.png',
    roughness: 0.2,
    metalness: 0.3,
    emoji: '⬜'
  }
};

// 원점 표시 헬퍼
function OriginHelper() {
  const axesHelper = useMemo(() => new THREE.AxesHelper(2), []);
  
  return (
    <group>
      {/* 축 표시 (X=빨강, Y=초록, Z=파랑) */}
      <primitive object={axesHelper} />
      
      {/* 원점 표시 구체 */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
    </group>
  );
}

// 바닥 평면
function GroundPlane({ textureType }: { textureType: GroundTextureType }) {
  const config = GROUND_TEXTURES[textureType];
  const [colorTexture, setColorTexture] = useState<THREE.Texture | null>(null);
  const [normalTexture, setNormalTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let color: THREE.Texture | null = null;
    let normal: THREE.Texture | null = null;
    
    // Color 텍스처 로드
    loader.load(
      config.textureUrl,
      (loadedTexture) => {
        // 텍스처 반복 설정
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.RepeatWrapping;
        loadedTexture.repeat.set(100, 100);
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        color = loadedTexture;
        setColorTexture(loadedTexture);
        console.log(`✓ Color 텍스처 로드 완료: ${config.name}`);
      },
      undefined,
      (error) => {
        console.warn(`Color 텍스처 로딩 실패 (${config.name}):`, error);
      }
    );

    // Normal 맵 로드
    loader.load(
      config.normalMapUrl,
      (loadedTexture) => {
        // Normal 맵도 동일하게 반복 설정
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.RepeatWrapping;
        loadedTexture.repeat.set(100, 100);
        normal = loadedTexture;
        setNormalTexture(loadedTexture);
        console.log(`✓ Normal 맵 로드 완료: ${config.name}`);
      },
      undefined,
      (error) => {
        console.warn(`Normal 맵 로딩 실패 (${config.name}):`, error);
      }
    );

    // Cleanup: 텍스처 메모리 해제
    return () => {
      if (color) color.dispose();
      if (normal) normal.dispose();
    };
  }, [textureType, config.textureUrl, config.normalMapUrl, config.name]);
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial 
        map={colorTexture}
        normalMap={normalTexture}
        normalScale={new THREE.Vector2(1, 1)} // Normal 강도 조절 (1, 1이 기본)
        roughness={config.roughness}
        metalness={config.metalness}
      />
    </mesh>
  );
}

const ModelViewer: React.FC<ModelViewerProps> = ({ model }) => {
  const [error, setError] = useState<string>('');
  const [showOrigin, setShowOrigin] = useState(true);
  const [firstPersonMode, setFirstPersonMode] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hasSeenInstructions, setHasSeenInstructions] = useState(false);
  const [groundTexture, setGroundTexture] = useState<GroundTextureType>('grass');
  const controlsRef = useRef<any>(null);

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    console.error('Model loading error:', errorMessage);
  };

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const toggleFirstPerson = () => {
    setFirstPersonMode(!firstPersonMode);
    setIsLocked(false);
  };

  const handleLock = () => {
    setIsLocked(true);
    setHasSeenInstructions(true); // 처음 잠금 시 안내를 본 것으로 처리
  };

  const cycleGroundTexture = () => {
    const types: GroundTextureType[] = ['grass', 'asphalt', 'dirt', 'pavement', 'marble'];
    const currentIndex = types.indexOf(groundTexture);
    const nextIndex = (currentIndex + 1) % types.length;
    setGroundTexture(types[nextIndex]);
  };

  return (
    <div className="model-viewer-container">
      <div className="viewer-controls">
        <button onClick={resetCamera} className="control-btn" disabled={firstPersonMode}>
          🔄 카메라 리셋
        </button>
        <button onClick={() => setShowOrigin(!showOrigin)} className="control-btn">
          {showOrigin ? '📍 원점 숨기기' : '📍 원점 보기'}
        </button>
        <button onClick={cycleGroundTexture} className="control-btn">
          {GROUND_TEXTURES[groundTexture].emoji} {GROUND_TEXTURES[groundTexture].name}
        </button>
        <button onClick={toggleFirstPerson} className="control-btn control-btn-primary">
          {firstPersonMode ? '👁️ 3인칭 모드' : '🎮 1인칭 모드'}
        </button>
        <div className="viewer-info">
          {firstPersonMode ? (
            <>
              <span>클릭: 마우스 잠금</span>
              <span>WASD: 이동</span>
              <span>Space: 점프</span>
              <span>Shift: 달리기</span>
              <span>ESC: 잠금 해제</span>
            </>
          ) : (
            <>
              <span>마우스 드래그: 회전</span>
              <span>스크롤: 줌</span>
              <span>우클릭 드래그: 이동</span>
            </>
          )}
        </div>
      </div>

      {/* 1인칭 모드 안내 오버레이 - 처음에만 표시 */}
      {firstPersonMode && !isLocked && !hasSeenInstructions && (
        <div className="fps-overlay">
          <div className="fps-instructions">
            <h3>🎮 1인칭 모드</h3>
            <p>화면을 클릭하여 마우스를 잠그세요</p>
            <ul>
              <li><strong>WASD</strong> - 이동</li>
              <li><strong>Space</strong> - 점프</li>
              <li><strong>Shift</strong> - 달리기</li>
              <li><strong>마우스</strong> - 시점 이동</li>
              <li><strong>ESC</strong> - 잠금 해제</li>
            </ul>
          </div>
        </div>
      )}

      {error ? (
        <div className="viewer-error">
          <p>❌ 모델 로딩 실패</p>
          <p>{error}</p>
        </div>
      ) : (
        <Canvas
          shadows
          style={{ background: firstPersonMode ? '#87CEEB' : '#1a1a1a' }}
        >
          {/* 카메라 */}
          <PerspectiveCamera 
            makeDefault 
            position={firstPersonMode ? [0, 0.7, 0] : [10, 7, 10]} 
            fov={firstPersonMode ? 75 : 50} 
          />

          {/* 컨트롤 - 모드에 따라 다르게 */}
          {firstPersonMode ? (
            <FirstPersonController 
              enabled={true}
              onLock={handleLock}
              onUnlock={() => setIsLocked(false)}
            />
          ) : (
            <OrbitControls
              ref={controlsRef}
              enableDamping
              dampingFactor={0.05}
              minDistance={1}
              maxDistance={50}
              maxPolarAngle={Math.PI / 2}
              target={[0, 2.5, 0]}
            />
          )}

          {/* 조명 */}
          <ambientLight intensity={firstPersonMode ? 0.6 : 0.5} />
          <directionalLight
            position={[10, 15, 5]}
            intensity={firstPersonMode ? 1.2 : 1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={50}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
          />
          <directionalLight position={[-10, 15, -5]} intensity={0.5} />
          <pointLight position={[0, 10, 0]} intensity={0.5} />

          {/* 환경 맵 */}
          <Environment preset={firstPersonMode ? "sunset" : "studio"} />

          {/* 하늘 (1인칭 모드에서만) */}
          {firstPersonMode && (
            <Sky
              distance={450000}
              sunPosition={[100, 20, 100]}
              inclination={0.6}
              azimuth={0.25}
            />
          )}

          {/* 바닥 */}
          <GroundPlane textureType={groundTexture} />

          {!firstPersonMode && (
            <Grid
              args={[20, 20]}
              cellSize={1}
              cellThickness={0.5}
              cellColor="#6e6e6e"
              sectionSize={5}
              sectionThickness={1}
              sectionColor="#9d4b4b"
              fadeDistance={25}
              fadeStrength={1}
              followCamera={false}
              infiniteGrid={true}
              position={[0, 0.01, 0]}
            />
          )}

          {/* 원점 표시 헬퍼 */}
          {showOrigin && !firstPersonMode && <OriginHelper />}

          {/* 3D 모델 */}
          <Suspense fallback={<Loader />}>
            <ModelLoader model={model} onError={handleError} />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
};

export default ModelViewer;
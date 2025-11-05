import React, { Suspense, useRef, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Model } from '../types/model';
import ModelLoader from './ModelLoader';

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

const ModelViewer: React.FC<ModelViewerProps> = ({ model }) => {
  const [error, setError] = useState<string>('');
  const [showOrigin, setShowOrigin] = useState(true);
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

  return (
    <div className="model-viewer-container">
      <div className="viewer-controls">
        <button onClick={resetCamera} className="control-btn">
          🔄 카메라 리셋
        </button>
        <button onClick={() => setShowOrigin(!showOrigin)} className="control-btn">
          {showOrigin ? '📍 원점 숨기기' : '📍 원점 보기'}
        </button>
        <div className="viewer-info">
          <span>마우스 드래그: 회전</span>
          <span>스크롤: 줌</span>
          <span>우클릭 드래그: 이동</span>
        </div>
      </div>

      {error ? (
        <div className="viewer-error">
          <p>❌ 모델 로딩 실패</p>
          <p>{error}</p>
        </div>
      ) : (
        <Canvas
          shadows
          style={{ background: '#1a1a1a' }}
        >
          {/* 카메라 */}
          <PerspectiveCamera makeDefault position={[10, 7, 10]} fov={50} />

          {/* 컨트롤 */}
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            minDistance={1}
            maxDistance={50}
            maxPolarAngle={Math.PI / 2}
            target={[0, 2.5, 0]}
          />

          {/* 조명 */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 15, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <directionalLight position={[-10, 15, -5]} intensity={0.5} />
          <pointLight position={[0, 10, 0]} intensity={0.5} />

          {/* 환경 맵 */}
          <Environment preset="studio" />

          {/* 그리드 - Y=0 평면에 배치 */}
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
            position={[0, 0, 0]}
          />

          {/* 원점 표시 헬퍼 */}
          {showOrigin && <OriginHelper />}

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
import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';

interface FirstPersonControllerProps {
  enabled: boolean;
  onLock?: () => void;
  onUnlock?: () => void;
}

const FirstPersonController: React.FC<FirstPersonControllerProps> = ({ 
  enabled, 
  onLock, 
  onUnlock 
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  
  // 플레이어 상태
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
  });
  
  const canJump = useRef(true);
  const playerHeight = 0.7; // 플레이어 눈 높이

  // 키보드 입력 처리
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveState.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          moveState.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          moveState.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          moveState.current.right = true;
          break;
        case 'Space':
          if (canJump.current) {
            velocity.current.y = 8; // 점프 속도
            canJump.current = false;
          }
          event.preventDefault();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          moveState.current.sprint = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveState.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          moveState.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          moveState.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          moveState.current.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          moveState.current.sprint = false;
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled]);

  // 매 프레임 업데이트
  useFrame((_, delta) => {
    if (!enabled || !controlsRef.current) return;

    const controls = controlsRef.current;
    
    // 이동 속도 (걷기/뛰기)
    const speed = moveState.current.sprint ? 1.5 : 0.9;
    
    // 감속
    velocity.current.x *= 0.6;
    velocity.current.z *= 0.6;
    
    // 중력
    velocity.current.y -= 25 * delta;
    
    // 이동 방향 계산
    direction.current.set(0, 0, 0);
    
    if (moveState.current.forward) direction.current.z -= 1;
    if (moveState.current.backward) direction.current.z += 1;
    if (moveState.current.left) direction.current.x -= 1;
    if (moveState.current.right) direction.current.x += 1;
    
    // 정규화
    if (direction.current.length() > 0) {
      direction.current.normalize();
    }
    
    // 카메라 방향 기준으로 이동
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0; // 수평 이동만
    cameraDirection.normalize();
    
    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(cameraDirection, camera.up).normalize();
    
    const moveDirection = new THREE.Vector3();
    moveDirection.addScaledVector(cameraDirection, -direction.current.z);
    moveDirection.addScaledVector(cameraRight, direction.current.x);
    
    velocity.current.x += moveDirection.x * speed * delta * 60;
    velocity.current.z += moveDirection.z * speed * delta * 60;
    
    // 위치 업데이트
    const newPosition = camera.position.clone();
    newPosition.x += velocity.current.x * delta;
    newPosition.y += velocity.current.y * delta;
    newPosition.z += velocity.current.z * delta;
    
    // 바닥 충돌 체크
    if (newPosition.y <= playerHeight) {
      newPosition.y = playerHeight;
      velocity.current.y = 0;
      canJump.current = true;
    }
    
    // 카메라 위치 적용
    camera.position.copy(newPosition);
  });

  if (!enabled) return null;

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={onLock}
      onUnlock={onUnlock}
    />
  );
};

export default FirstPersonController;
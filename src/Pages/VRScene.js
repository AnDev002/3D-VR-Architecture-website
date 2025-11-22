import React, { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  PointerLockControls, Text, Plane, TransformControls, useGLTF, Ring
} from '@react-three/drei';
import * as THREE from 'three';

// --- 1. UTILS & HOOKS ---

// Hook xử lý bàn phím
const useKeyboardControls = () => {
  const [movement, setMovement] = useState({
    forward: false, backward: false, left: false, right: false,
  });
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': setMovement((m) => ({ ...m, forward: true })); break;
        case 'KeyS': case 'ArrowDown': setMovement((m) => ({ ...m, backward: true })); break;
        case 'KeyA': case 'ArrowLeft': setMovement((m) => ({ ...m, left: true })); break;
        case 'KeyD': case 'ArrowRight': setMovement((m) => ({ ...m, right: true })); break;
        default: break;
      }
    };
    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': setMovement((m) => ({ ...m, forward: false })); break;
        case 'KeyS': case 'ArrowDown': setMovement((m) => ({ ...m, backward: false })); break;
        case 'KeyA': case 'ArrowLeft': setMovement((m) => ({ ...m, left: false })); break;
        case 'KeyD': case 'ArrowRight': setMovement((m) => ({ ...m, right: false })); break;
        default: break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  return movement;
};

// --- 2. COMPONENTS ---

// Component hiển thị vòng tròn đích đến (Teleport Marker) giống kính VR
function TeleportReticle({ isLocked, onTeleportTargetUpdate }) {
  const { camera, scene } = useThree();
  const reticleRef = useRef();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useFrame(() => {
    if (!isLocked || !reticleRef.current) {
      if (reticleRef.current) reticleRef.current.visible = false;
      return;
    }

    // Bắn tia từ chính giữa màn hình
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    // Tìm giao điểm với sàn nhà (Object có name là "Ground")
    const ground = scene.getObjectByName("Ground");
    if (ground) {
      const intersects = raycaster.intersectObject(ground);
      
      if (intersects.length > 0) {
        reticleRef.current.visible = true;
        const point = intersects[0].point;
        // Đặt vòng tròn nằm ngang trên mặt sàn
        reticleRef.current.position.set(point.x, point.y + 0.02, point.z);
        reticleRef.current.rotation.x = -Math.PI / 2;
        
        // Gửi vị trí này ra ngoài để dùng cho teleport click
        if (onTeleportTargetUpdate) onTeleportTargetUpdate(point);
      } else {
        reticleRef.current.visible = false;
        if (onTeleportTargetUpdate) onTeleportTargetUpdate(null);
      }
    }
  });

  return (
    <Ring ref={reticleRef} args={[0.15, 0.2, 32]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshBasicMaterial color="#00ff00" opacity={0.5} transparent />
    </Ring>
  );
}

function PlayerMovement({ isVRMode, isLocked, collidableRef }) {
  const { camera } = useThree();
  const movement = useKeyboardControls();
  const playerSpeed = 5.0;
  
  // Raycaster để phát hiện va chạm
  const collisionRaycaster = useMemo(() => new THREE.Raycaster(), []);
  // Khoảng cách tối thiểu để tính là va chạm (1 mét)
  const collisionDistance = 1.0; 

  useFrame((state, delta) => {
    if (isVRMode) return;
    if (!isLocked) return; 

    // 1. Tính toán vector di chuyển dự kiến
    const moveDirection = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
    
    if (movement.forward) moveDirection.add(forward);
    if (movement.backward) moveDirection.sub(forward);
    if (movement.left) moveDirection.sub(right);
    if (movement.right) moveDirection.add(right);
    
    if (moveDirection.length() > 0) {
      moveDirection.normalize();

      // 2. [QUAN TRỌNG] Xử lý va chạm (Collision Detection)
      let canMove = true;

      if (collidableRef && collidableRef.current) {
        // Đặt tia ray tại vị trí camera, hướng theo hướng muốn đi
        // Hạ thấp ray xuống một chút (ngực nhân vật) để dò tường tốt hơn
        const rayOrigin = camera.position.clone();
        rayOrigin.y -= 0.5; 
        
        collisionRaycaster.set(rayOrigin, moveDirection);

        // Kiểm tra va chạm với model
        const intersects = collisionRaycaster.intersectObject(collidableRef.current, true);
        
        // Nếu có vật cản ở quá gần (< collisionDistance) -> Chặn di chuyển
        if (intersects.length > 0 && intersects[0].distance < collisionDistance) {
          canMove = false;
        }
      }

      // 3. Áp dụng di chuyển nếu không va chạm
      if (canMove) {
        camera.position.addScaledVector(moveDirection, playerSpeed * delta);
      }
    }
  });
  return null;
}

function CameraController({ startPosition, startRotation, targetPosition, onMoveComplete }) {
  const { camera } = useThree();
  const initialized = useRef(false);
  const isMoving = useRef(false);
  
  // Dùng ref để lưu trạng thái di chuyển nhằm tránh re-render
  const moveState = useRef({
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
    duration: 0,
    progress: 0
  });

  // Khởi tạo vị trí ban đầu
  useEffect(() => {
    if (!initialized.current && startPosition) {
      camera.position.set(...startPosition);
      if (startRotation) {
        camera.rotation.set(startRotation[0], startRotation[1], startRotation[2]);
      }
      initialized.current = true;
    }
  }, [startPosition, startRotation, camera]);

  useFrame((state, delta) => {
    // Nếu có yêu cầu di chuyển (targetPosition khác null)
    if (targetPosition) {
      
      // BẮT ĐẦU DI CHUYỂN (chạy 1 lần khi mới click)
      if (!isMoving.current) {
        isMoving.current = true;
        moveState.current.progress = 0;
        moveState.current.start.copy(camera.position);
        
        // [FIX 1] Giữ nguyên độ cao mắt (Y) để không bị "cắm đầu xuống đất"
        // Lấy X, Z của đích đến, nhưng Y lấy của Camera hiện tại (thường là 1.6)
        moveState.current.end.set(targetPosition.x, camera.position.y, targetPosition.z);
        
        // [FIX 2] Tính toán tốc độ không đổi (Constant Speed) giống game
        const distance = moveState.current.start.distanceTo(moveState.current.end);
        const speed = 8.0; // Tốc độ di chuyển (mét/giây). Tăng số này để đi nhanh hơn (giống LoL)
        
        // Thời gian di chuyển = Quãng đường / Tốc độ
        moveState.current.duration = distance > 0 ? distance / speed : 0;
      }
      
      // CẬP NHẬT VỊ TRÍ TỪNG FRAME
      // Nếu duration quá nhỏ (đứng quá gần) thì đến luôn
      if (moveState.current.duration <= 0.01) {
        moveState.current.progress = 1;
      } else {
        // Cộng dồn tiến độ: progress = thời gian trôi qua / tổng thời gian cần
        moveState.current.progress += delta / moveState.current.duration;
      }

      if (moveState.current.progress >= 1) {
        // Đã đến nơi
        camera.position.copy(moveState.current.end);
        isMoving.current = false;
        if (onMoveComplete) onMoveComplete();
      } else {
        // Đang di chuyển: Nội suy mượt mà giữa điểm đầu và điểm cuối
        camera.position.lerpVectors(
          moveState.current.start, 
          moveState.current.end, 
          moveState.current.progress
        );
      }
    }
  });

  return null;
}

function Ground() {
  return (
    <Plane 
      name="Ground" // Đặt tên để Raycaster tìm thấy
      args={[100, 100]} 
      rotation={[-Math.PI / 2, 0, 0]} 
      receiveShadow
    >
      <meshStandardMaterial color="#e0e0e0" />
    </Plane>
  );
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
    </>
  );
}

const UploadedModel = React.forwardRef(({ url, transformMode, isEditing, initialTransform }, ref) => {
  const { scene } = useGLTF(url);
  
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) { 
        child.castShadow = true; 
        child.receiveShadow = true; 
        // Cấu hình material để check va chạm tốt hơn (double side)
        if(child.material) child.material.side = THREE.DoubleSide;
      }
    });
  }, [scene]);

  useEffect(() => {
    if (ref.current && scene) {
      const isDefaultScale = 
        initialTransform.scale[0] === 1 && 
        initialTransform.scale[1] === 1 && 
        initialTransform.scale[2] === 1;

      if (isDefaultScale) {
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const TARGET_SIZE = 20.0; 
        const maxDim = Math.max(size.x, size.y, size.z);
        let scaleFactor = 1;

        if (maxDim > TARGET_SIZE) {
          scaleFactor = TARGET_SIZE / maxDim;
        }
        if (size.y * scaleFactor < 3) {
          scaleFactor = 3 / size.y;
        }

        ref.current.scale.set(scaleFactor, scaleFactor, scaleFactor);
        ref.current.position.x = -center.x * scaleFactor;
        ref.current.position.y = (-box.min.y * scaleFactor) + 0.05; 
        ref.current.position.z = -center.z * scaleFactor;
      } else {
        ref.current.position.set(...initialTransform.position);
        ref.current.rotation.set(...initialTransform.rotation);
        ref.current.scale.set(...initialTransform.scale);
      }
    }
  }, [scene, initialTransform, ref]); 

  const ModelMesh = <primitive ref={ref} object={scene} />;

  if (isEditing) {
    return (
      <TransformControls object={ref} mode={transformMode}>
        {ModelMesh}
      </TransformControls>
    );
  }
  return ModelMesh;
});

// --- 3. SCENE CHÍNH ---

function Scene({ isVRMode, isEditing, modelUrl, transformMode, savedData, onSaveScene }) {
  const modelRef = useRef();
  const { camera, gl, scene } = useThree();
  const [isLocked, setIsLocked] = useState(false);
  const [teleportTarget, setTeleportTarget] = useState(null);
  
  // Biến lưu vị trí Reticle hiện tại (nơi đang nhìn vào)
  const currentReticlePos = useRef(null);

  const defaultTransform = useMemo(() => ({
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1]
  }), []);

  useEffect(() => {
    // Xử lý sự kiện Click chuột để Teleport
    const handleMouseClick = () => {
      if (isLocked && currentReticlePos.current) {
        // Clone vị trí để tránh reference error
        setTeleportTarget(currentReticlePos.current.clone());
      }
    };
    window.addEventListener('mousedown', handleMouseClick);
    return () => window.removeEventListener('mousedown', handleMouseClick);
  }, [isLocked]);

  useEffect(() => {
    return () => {
      if (document.pointerLockElement === gl.domElement) {
        document.exitPointerLock();
      }
    };
  }, [gl]);

  const handleTriggerSave = () => {
    if (modelRef.current && onSaveScene) {
      // 1. Render frame hiện tại để đảm bảo ảnh mới nhất
      gl.render(scene, camera);
      
      // 2. Chụp ảnh (giảm chất lượng xuống 0.5 để nhẹ DB)
      const screenshot = gl.domElement.toDataURL('image/jpeg', 0.5);

      onSaveScene({
        modelTransform: { 
          position: modelRef.current.position.toArray(),
          rotation: modelRef.current.rotation.toArray().slice(0, 3),
          scale: modelRef.current.scale.toArray()
        },
        cameraStart: { 
          position: camera.position.toArray(),
          rotation: camera.rotation.toArray().slice(0, 3)
        },
        thumbnail: screenshot // <--- Gửi ảnh về App
      });
    }
  };

  useEffect(() => {
    if (isEditing) window.triggerSceneSave = handleTriggerSave;
  }, [isEditing, onSaveScene]);

  return (
    <>
      <CameraController 
        startPosition={savedData?.cameraStart?.position || [0, 1.6, 0]}
        startRotation={savedData?.cameraStart?.rotation}
        targetPosition={teleportTarget}
        onMoveComplete={() => setTeleportTarget(null)}
      />

      {/* Truyền modelRef vào PlayerMovement để check va chạm */}
      <PlayerMovement isVRMode={isVRMode} isLocked={isLocked} collidableRef={modelRef} />
      
      {/* Reticle chỉ hiện khi ở chế độ khóa chuột (View Mode) */}
      {!isEditing && (
        <TeleportReticle 
          isLocked={isLocked} 
          onTeleportTargetUpdate={(pos) => (currentReticlePos.current = pos)}
        />
      )}
      
      {!isVRMode && (
        <PointerLockControls 
          selector="#canvas-container" // Chỉ lock khi click vào canvas
          onLock={() => setIsLocked(true)}
          onUnlock={() => setIsLocked(false)}
        />
      )}
      
      <Lighting />
      <Ground />

      {modelUrl && (
        <Suspense fallback={<Text position={[0, 2, 0]} color="black">Loading...</Text>}>
          <UploadedModel 
            ref={modelRef}
            url={modelUrl} 
            isEditing={isEditing}
            transformMode={transformMode}
            initialTransform={savedData?.modelTransform || defaultTransform}
          />
        </Suspense>
      )}
    </>
  );
}

// --- 4. WRAPPER & UI ---

export default function VRScene({ mode = 'view', modelFile, savedData, onSave }) {
  const [isVRMode, setIsVRMode] = useState(false);
  const [transformMode, setTransformMode] = useState('translate');
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (modelFile) {
      const url = URL.createObjectURL(modelFile);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [modelFile]);

  useEffect(() => {
    if (mode === 'edit') {
      const handler = (e) => {
        if (e.target.tagName === 'INPUT') return;
        switch(e.key.toLowerCase()) {
          case 't': setTransformMode('translate'); break;
          case 'r': setTransformMode('rotate'); break;
          case 's': setTransformMode('scale'); break;
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [mode]);

  const stopPropagation = (e) => {
    e.stopPropagation();
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
  };

  return (
    <div id="canvas-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ width: '100%', height: '100%' }}>
        {/* QUAN TRỌNG: Thêm gl={{ preserveDrawingBuffer: true }} để chụp ảnh không bị đen */}
        <Canvas shadows camera={{ fov: 75 }} vr={isVRMode} gl={{ preserveDrawingBuffer: true }}>
          <Scene 
            isVRMode={isVRMode}
            isEditing={mode === 'edit'}
            transformMode={transformMode}
            modelUrl={objectUrl}
            savedData={savedData}
            onSaveScene={onSave}
          />
        </Canvas>
      </div>

      {/* Crosshair (Dấu cộng) ở giữa màn hình để người dùng biết tâm điểm */}
      {!isVRMode && mode === 'view' && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', 
          width: 10, height: 10, 
          background: 'rgba(255, 255, 255, 0.5)', 
          borderRadius: '50%', 
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none', // Không chặn click
          border: '1px solid black',
          zIndex: 10
        }} />
      )}

      {/* Hướng dẫn sử dụng */}
      {mode === 'view' && (
        <div style={{
          position: 'absolute', bottom: 20, left: 20, 
          color: 'white', background: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 8,
          pointerEvents: 'none', userSelect: 'none'
        }}>
          Click to Start<br/>
          WASD to Move<br/>
          Mouse to Look<br/>
          Click to Teleport
        </div>
      )}

      {/* Editor UI */}
      {mode === 'edit' && (
        <div 
          onMouseDown={stopPropagation} 
          onClick={stopPropagation}
          style={{
            position: 'absolute', top: 20, right: 20, 
            background: 'rgba(0,0,0,0.8)', padding: 15, borderRadius: 8, color: 'white', zIndex: 10
          }}
        >
          <h4>Editor Controls</h4>
          <div style={{fontSize: 12, color: '#ccc', marginBottom: 10}}>
            • <b>ESC</b>: Unlock mouse<br/>
            • <b>T / R / S</b>: Switch Modes<br/>
          </div>
          <div style={{marginBottom: 10, display: 'flex', gap: 5}}>
            <button onClick={() => setTransformMode('translate')} style={btnStyle(transformMode === 'translate')}>Move (T)</button>
            <button onClick={() => setTransformMode('rotate')} style={btnStyle(transformMode === 'rotate')}>Rotate (R)</button>
            <button onClick={() => setTransformMode('scale')} style={btnStyle(transformMode === 'scale')}>Scale (S)</button>
          </div>
          <button 
            onClick={() => window.triggerSceneSave && window.triggerSceneSave()}
            style={{
              background: '#4ecdc4', border: 'none', padding: '10px', 
              borderRadius: 4, cursor: 'pointer', width: '100%', fontWeight: 'bold', color: 'white'
            }}
          >
            SAVE / UPDATE
          </button>
        </div>
      )}
      
      {mode === 'view' && (
        <button 
          onClick={() => setIsVRMode(true)}
          style={{
            position: 'absolute', bottom: 20, right: 20, padding: '10px 20px', zIndex: 10
          }}
        >
          Enter VR
        </button>
      )}
    </div>
  );
}

const btnStyle = (isActive) => ({
  flex: 1, padding: '5px',
  background: isActive ? '#4ecdc4' : '#444',
  color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer'
});
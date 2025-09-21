import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  PointerLockControls, 
  Text, 
  Plane, 
  Box,
  Sphere
} from '@react-three/drei';
import * as THREE from 'three';

// Hook để theo dõi trạng thái các phím di chuyển
const useKeyboardControls = () => {
  const [movement, setMovement] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':
          setMovement((m) => ({ ...m, forward: true }));
          break;
        case 'KeyS': case 'ArrowDown':
          setMovement((m) => ({ ...m, backward: true }));
          break;
        case 'KeyA': case 'ArrowLeft':
          setMovement((m) => ({ ...m, left: true }));
          break;
        case 'KeyD': case 'ArrowRight':
          setMovement((m) => ({ ...m, right: true }));
          break;
        default: break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':
          setMovement((m) => ({ ...m, forward: false }));
          break;
        case 'KeyS': case 'ArrowDown':
          setMovement((m) => ({ ...m, backward: false }));
          break;
        case 'KeyA': case 'ArrowLeft':
          setMovement((m) => ({ ...m, left: false }));
          break;
        case 'KeyD': case 'ArrowRight':
          setMovement((m) => ({ ...m, right: false }));
          break;
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

// Component xử lý logic di chuyển của người chơi
function PlayerMovement({ isVRMode }) {
  const { camera } = useThree();
  const movement = useKeyboardControls();
  const playerSpeed = 5.0; // Tốc độ di chuyển (mét/giây)

  useFrame((state, delta) => {
    // Chỉ di chuyển khi con trỏ đã được khóa và không ở trong chế độ VR
    if (isVRMode || !state.controls?.isLocked) {
      return;
    }

    const moveDirection = new THREE.Vector3();
    const rightDirection = new THREE.Vector3();
    
    // Lấy hướng nhìn phía trước trên mặt phẳng ngang
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    // Lấy hướng bên phải trên mặt phẳng ngang
    rightDirection.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
    
    if (movement.forward) moveDirection.add(forward);
    if (movement.backward) moveDirection.sub(forward);
    if (movement.left) moveDirection.sub(rightDirection);
    if (movement.right) moveDirection.add(rightDirection);
    
    // Áp dụng di chuyển vào vị trí camera
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      camera.position.addScaledVector(moveDirection, playerSpeed * delta);
    }
  });

  return null;
}

// Waypoints configuration
const WAYPOINTS = [
  { 
    position: [5, 1.6, 5], 
    target: [0, 0, 0], 
    name: "View Center" 
  },
  { 
    position: [-5, 1.6, -5], 
    target: [5, 0, 5], 
    name: "View Building" 
  },
  { 
    position: [0, 1.6, 8], 
    target: [0, 0, -8], 
    name: "Overview" 
  },
  { 
    position: [8, 1.6, 0], 
    target: [-8, 0, 0], 
    name: "Side View" 
  }
];

// Camera Controller Component
function CameraController({ isVRMode, targetPosition, targetLookAt, onMoveComplete }) {
  const { camera } = useThree();
  const isMoving = useRef(false);
  const startPos = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3());
  const progress = useRef(0);
  
  useFrame((state, delta) => {
    if (targetPosition && !isVRMode) {
      if (!isMoving.current) {
        startPos.current.copy(camera.position);
        isMoving.current = true;
        progress.current = 0;
      }
      
      progress.current = Math.min(progress.current + delta * 2, 1);
      camera.position.lerpVectors(startPos.current, targetPosition, progress.current);
      
      if (targetLookAt) {
        const currentDir = new THREE.Vector3();
        camera.getWorldDirection(currentDir);
        
        const targetDir = new THREE.Vector3().subVectors(targetLookAt, camera.position).normalize();
        
        const lerpedDir = currentDir.lerp(targetDir, progress.current * 0.1);
        const lookAtPoint = camera.position.clone().add(lerpedDir.multiplyScalar(10));
        camera.lookAt(lookAtPoint);
      }
      
      if (progress.current >= 1) {
        isMoving.current = false;
        if (onMoveComplete) onMoveComplete();
      }
    }
  });
  
  return null;
}

// Waypoint Marker Component
function WaypointMarker({ position, target, name, onClick, isActive }) {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });
  
  return (
    <group position={position}>
      <Sphere 
        ref={meshRef}
        args={[0.2, 16, 16]}
        onClick={onClick}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'default'}
      >
        <meshStandardMaterial 
          color={isActive ? "#ff6b6b" : "#4ecdc4"} 
          emissive={isActive ? "#ff6b6b" : "#4ecdc4"}
          emissiveIntensity={0.2}
          transparent
          opacity={0.8}
        />
      </Sphere>
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        billboard
      >
        {name}
      </Text>
    </group>
  );
}

// Teleport Cursor Component
function TeleportCursor({ position }) {
  const mesh = useRef();
  
  useFrame(() => {
    if (mesh.current) {
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.1;
      mesh.current.scale.set(scale, scale, scale);
    }
  });

  if (!position) return null;

  return (
    <mesh ref={mesh} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.2, 0.25, 32]} />
      <meshBasicMaterial color="#4ecdc4" transparent opacity={0.8} />
    </mesh>
  );
}

// Ground Component with Click Handler
function Ground({ onGroundClick, onPointerMove, onPointerOut }) {
  return (
    <Plane 
      args={[50, 50]} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0, 0]}
      onClick={onGroundClick}
      onPointerMove={onPointerMove}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
        if (onPointerOut) onPointerOut();
      }}
      onPointerOver={() => document.body.style.cursor = 'crosshair'}
    >
      <meshStandardMaterial color="#e0e0e0" />
    </Plane>
  );
}

// Architecture Buildings
function Buildings() {
  return (
    <group>
      <Box position={[0, 2.5, 0]} args={[3, 5, 3]}><meshStandardMaterial color="#8d6e63" /></Box>
      <Box position={[5, 1.5, 2]} args={[2, 3, 4]}><meshStandardMaterial color="#5d4037" /></Box>
      <Box position={[-3, 3, -3]} args={[1.5, 6, 1.5]}><meshStandardMaterial color="#6d4c41" /></Box>
      <Box position={[7, 0.5, -2]} args={[2, 1, 2]}><meshStandardMaterial color="#795548" /></Box>
      <Box position={[-6, 1, 4]} args={[1, 2, 3]}><meshStandardMaterial color="#3e2723" /></Box>
    </group>
  );
}

// Lighting Setup
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 5, 0]} intensity={0.4} color="#ffeaa7" />
    </>
  );
}

// Main Scene Component
function Scene({ isVRMode }) {
  const [targetPosition, setTargetPosition] = useState(null);
  const [targetLookAt, setTargetLookAt] = useState(null);
  const [activeWaypoint, setActiveWaypoint] = useState(null);
  const [cursorPosition, setCursorPosition] = useState(null);
  const { camera } = useThree();
  
  const handleGroundClick = (event) => {
    if (isVRMode) return;
    event.stopPropagation();
    const intersect = event.intersections[0];
    if (intersect) {
      const newPos = new THREE.Vector3(intersect.point.x, 1.6, intersect.point.z);
      setTargetPosition(newPos);
      setTargetLookAt(null);
      setActiveWaypoint(null);
    }
  };

  const handleGroundPointerMove = (event) => {
    if (isVRMode) return;
    event.stopPropagation();
    setCursorPosition(event.point.clone().add(new THREE.Vector3(0, 0.01, 0)));
  };

  const handleGroundPointerOut = () => {
    setCursorPosition(null);
  };
  
  const handleWaypointClick = (waypoint, index) => {
    if (isVRMode) return;
    const newPos = new THREE.Vector3(...waypoint.position);
    const lookAt = new THREE.Vector3(...waypoint.target);
    setTargetPosition(newPos);
    setTargetLookAt(lookAt);
    setActiveWaypoint(index);
  };
  
  useEffect(() => {
    const checkWaypoints = () => {
      if (isVRMode) return;
      WAYPOINTS.forEach((waypoint, index) => {
        const waypointPos = new THREE.Vector3(...waypoint.position);
        const distance = camera.position.distanceTo(waypointPos);
        if (distance < 2 && activeWaypoint !== index) {
          const lookAt = new THREE.Vector3(...waypoint.target);
          setTargetLookAt(lookAt);
          setActiveWaypoint(index);
        }
      });
    };
    const interval = setInterval(checkWaypoints, 100);
    return () => clearInterval(interval);
  }, [camera, activeWaypoint, isVRMode]);
  
  return (
    <>
      <PlayerMovement isVRMode={isVRMode} />
      <CameraController 
        isVRMode={isVRMode}
        targetPosition={targetPosition}
        targetLookAt={targetLookAt}
        onMoveComplete={() => {
          setTargetPosition(null);
          setTargetLookAt(null);
        }}
      />
      
      {!isVRMode && (
        <PointerLockControls 
          maxPolarAngle={Math.PI * 0.9}
          minPolarAngle={Math.PI * 0.1}
        />
      )}
      
      <Lighting />
      <Ground 
        onGroundClick={handleGroundClick} 
        onPointerMove={handleGroundPointerMove}
        onPointerOut={handleGroundPointerOut}
      />
      <Buildings />
      
      {WAYPOINTS.map((waypoint, index) => (
        <WaypointMarker
          key={index}
          position={waypoint.position}
          target={waypoint.target}
          name={waypoint.name}
          isActive={activeWaypoint === index}
          onClick={() => handleWaypointClick(waypoint, index)}
        />
      ))}
      
      <TeleportCursor position={cursorPosition} />
      
      <Text position={[0, 8, -10]} fontSize={1} color="#ffffff" anchorX="center" anchorY="middle">
        VR Architecture Explorer
      </Text>
      
      <Text position={[0, 6.5, -10]} fontSize={0.4} color="#cccccc" anchorX="center" anchorY="middle">
        WASD to move • Click ground to teleport • Click waypoints for guided views
      </Text>
    </>
  );
}

// VR Button Component
function VRButton({ onEnterVR, isVRSupported }) {
  if (!isVRSupported) {
    return (
      <div style={{
        position: 'fixed', bottom: '20px', right: '20px', padding: '12px 24px',
        backgroundColor: '#666', color: '#fff', border: 'none', borderRadius: '8px',
        cursor: 'not-allowed', fontFamily: 'Arial, sans-serif', fontSize: '14px', opacity: 0.5
      }}>
        VR Not Supported
      </div>
    );
  }
  
  return (
    <button
      onClick={onEnterVR}
      style={{
        position: 'fixed', bottom: '20px', right: '20px', padding: '15px 30px',
        backgroundColor: '#4ecdc4', color: '#fff', border: 'none', borderRadius: '12px',
        cursor: 'pointer', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: 'bold',
        boxShadow: '0 4px 15px rgba(78, 205, 196, 0.3)', transition: 'all 0.3s ease',
        transform: 'scale(1)',
      }}
      onMouseOver={(e) => { e.target.style.backgroundColor = '#45b7aa'; e.target.style.transform = 'scale(1.05)'; }}
      onMouseOut={(e) => { e.target.style.backgroundColor = '#4ecdc4'; e.target.style.transform = 'scale(1)'; }}
      onMouseDown={(e) => { e.target.style.transform = 'scale(0.95)'; }}
      onMouseUp={(e) => { e.target.style.transform = 'scale(1.05)'; }}
    >
      🥽 Enter VR
    </button>
  );
}

// Main VR Scene Component
export default function VRScene() {
  const [isVRMode, setIsVRMode] = useState(false);
  const [isVRSupported, setIsVRSupported] = useState(false);
  
  useEffect(() => {
    if ('xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        setIsVRSupported(supported);
      }).catch(() => setIsVRSupported(false));
    } else {
      setIsVRSupported(false);
    }
  }, []);
  
  const handleEnterVR = async () => {
    if (!isVRSupported) return;
    try {
      setIsVRMode(true);
    } catch (error) {
      console.error('Failed to enter VR:', error);
      setIsVRMode(false);
    }
  };
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 1.6, 10], fov: 75, near: 0.1, far: 1000 }}
        shadows
        vr={isVRMode}
        style={{ background: 'linear-gradient(to bottom, #87CEEB, #98FB98)' }}
      >
        <Scene isVRMode={isVRMode} />
      </Canvas>
      
      <VRButton onEnterVR={handleEnterVR} isVRSupported={isVRSupported} />
      
      <div style={{
        position: 'fixed', top: '20px', left: '20px', color: '#fff',
        fontFamily: 'Arial, sans-serif', fontSize: '14px', backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '15px', borderRadius: '8px', maxWidth: '300px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#4ecdc4' }}>Controls:</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><b>WASD:</b> Move around</li>
          <li><b>Mouse:</b> Look around (click to lock)</li>
          <li><b>Click ground:</b> Teleport</li>
          <li><b>Click waypoints:</b> Auto-orient view</li>
          <li><b>VR:</b> Controller teleport</li>
        </ul>
      </div>
      
      {isVRMode && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          color: '#fff', fontSize: '18px', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.8)',
          padding: '20px', borderRadius: '12px'
        }}>
          VR Mode Active <br /> <small>Use controllers to navigate</small>
        </div>
      )}
    </div>
  );
}
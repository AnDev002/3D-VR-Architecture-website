// src/App.js
import React, { useEffect, useState } from 'react';
import VRScene from './Pages/VRScene';
import './App.css'; 
import LandingPage from './LandingPage';
import { saveRoomToDB, getRoomsFromDB, deleteRoomFromDB } from './db';

// ... (Giữ nguyên phần Uploader và modalStyle)
const modalStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
};
const modalContentStyle = {
  backgroundColor: '#fff', padding: '40px', borderRadius: '16px', width: '400px', textAlign: 'center'
};

const Uploader = ({ onFileSelected, onCancel }) => (
  <div style={modalStyle}>
    <div style={modalContentStyle}>
      <h2 style={{marginBottom: '20px', fontSize: '24px'}}>Secret Upload</h2>
      <p style={{marginBottom: '20px', color: '#666'}}>Upload your .GLB model here</p>
      <input 
        type="file" 
        accept=".glb,.gltf" 
        onChange={(e) => e.target.files[0] && onFileSelected(e.target.files[0])}
        style={{marginBottom: '20px'}}
      />
      <br/>
      <button onClick={onCancel} style={{padding: '10px 20px', cursor: 'pointer', border:'1px solid #ddd', background:'transparent', borderRadius: '8px'}}>
        Close
      </button>
    </div>
  </div>
);

export default function App() {
  const [view, setView] = useState('gallery'); 
  const [items, setItems] = useState([]); 
  const [currentSession, setCurrentSession] = useState(null); 
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
      getRoomsFromDB().then(setItems);
  }, []);

  // TRICK: Ctrl + Q để mở upload
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setShowUploader(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startNewRoom = (file) => {
    setCurrentSession({
      id: Date.now(),
      file: file,
      name: file.name.replace(/\.[^/.]+$/, ""), 
      createdAt: Date.now(),
      config: null 
    });
    setShowUploader(false);
    setView('editor');
  };

  // LƯU PHÒNG + ẢNH
  const handleSaveRoom = async (sceneData) => {
    const { thumbnail, ...restConfig } = sceneData;
    const newItem = {
      ...currentSession,
      screenshot: thumbnail,
      config: restConfig 
    };
    await saveRoomToDB(newItem);
    const updatedRooms = await getRoomsFromDB();
    setItems(updatedRooms);
    setView('gallery');
    setCurrentSession(null);
  };

  const handleDeleteRoom = async (id) => {
    await deleteRoomFromDB(id);
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSelectRoom = (item) => {
    setCurrentSession(item);
    setView('viewer');
  };

  return (
    <div className="App">
      {/* MAIN VIEWS */}
      {view === 'gallery' && (
        <>
          {/* Đã sửa: Chỉ dùng 1 LandingPage và truyền đủ props */}
          <LandingPage 
            items={items} 
            onSelect={handleSelectRoom} 
            onDeleteRoom={handleDeleteRoom} 
          />
          
          {showUploader && (
            <Uploader 
              onFileSelected={startNewRoom} 
              onCancel={() => setShowUploader(false)} 
            />
          )}
        </>
      )}

      {/* SCENE RENDER */}
      {(view === 'editor' || view === 'viewer') && currentSession && (
        <div style={{height: '100vh', width: '100vw', background: '#111'}}>
          <VRScene 
            mode={view === 'editor' ? 'edit' : 'view'}
            modelFile={currentSession.file}
            savedData={currentSession.config}
            onSave={handleSaveRoom}
          />
        </div>
      )}
    </div>
  );
}
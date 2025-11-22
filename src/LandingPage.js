// src/LandingPage.js
import React, { useState, useEffect } from "react"; // Cập nhật import
import "./LandingPage.css";

// ... (Giữ nguyên component PlaceholderGradient, TrashIcon, ProjectCard cũ)
// Lưu ý: ProjectCard không cần sửa, nó nhận class từ file CSS

const PlaceholderGradient = ({ id }) => {
  const gradients = [
    'linear-gradient(45deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)',
    'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)',
    'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
  ];
  const bg = gradients[id % gradients.length] || gradients[0];
  return (
    <div style={{width: '100%', height: '100%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
       <span style={{fontWeight: 600, opacity: 0.2, fontSize: 80}}>3D</span>
    </div>
  );
};

const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const ProjectCard = ({ data, onClick, onDelete }) => {
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (window.confirm("Delete this room permanently?")) {
        if (onDelete) onDelete(data.id);
    }
  };

  return (
    <div className="project-card" onClick={() => onClick(data)}>
      <div className="project-card__image-wrapper">
        {/* Nút xoá - CSS sẽ xử lý việc hiển thị dựa trên class cha */}
        <button className="delete-btn" onClick={handleDeleteClick} title="Delete Room (Ctrl + Hover)">
            <TrashIcon />
        </button>

        {data.screenshot ? (
           <img src={data.screenshot} alt={data.name} className="project-card__image" />
        ) : (
           <PlaceholderGradient id={data.id} />
        )}
      </div>
      
      <div className="project-card__content">
        <div className="project-card__header">
          <h3 className="project-card__title">{data.name}</h3>
          <span className="tag-pro">Interactive</span>
        </div>
        <div className="project-card__footer">
          <div className="author-avatar"></div>
          <div className="author-info">
            by <span className="author-name">Admin</span> • {new Date(data.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

const LandingPage = ({ items, onSelect, onDeleteRoom }) => {
  // --- LOGIC MỚI: Bắt sự kiện phím Ctrl ---
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Control' || e.metaKey) setIsCtrlPressed(true);
    };
    const handleKeyUp = (e) => {
      if (e.key === 'Control' || e.metaKey) setIsCtrlPressed(false);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  // ----------------------------------------

  const MENU_LINKS = [
    { title: "Directory", items: ["Architects", "Designers", "Studios"] },
    { title: "Collections", items: ["Minimalist", "Brutalism", "Futuristic"] },
    { title: "Awards", items: ["Site of the Day", "Developer Award"] },
  ];

  return (
    // Thêm class 'ctrl-mode' khi đang giữ Ctrl
    <div className={`landing-page ${isCtrlPressed ? 'ctrl-mode' : ''}`}>
      
      <header className="header">
        <div className="container">
            <div className="header__top">
                <div className="header__badge">
                    <strong>Site of the Day</strong>
                    <span>Nov 22, 2025</span>
                </div>
                <div style={{textAlign: 'right', fontSize: '12px', color: '#666'}}>
                    ARCHITECTURE <br/> VIRTUAL REALITY
                </div>
            </div>
            <h1 className="header__title">VR.Showroom</h1>
            <div style={{display: 'flex', justifyContent: 'center', gap: 40, marginTop: 20}}>
                <span style={{borderBottom: '1px solid #000', paddingBottom: 4}}>curated by you</span>
                <span style={{borderBottom: '1px solid #000', paddingBottom: 4}}>webgl experience</span>
            </div>
        </div>
      </header>

      <main className="container">
        {/* NAV MENUS giữ nguyên */}
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 100, flexWrap: 'wrap', gap: 40}}>
            {MENU_LINKS.map((menu, idx) => (
                <div key={idx} className="menu-column">
                    <h4 className="menu-column__title">{menu.title}</h4>
                    <ul className="menu-column__list">
                        {menu.items.map((item, i) => (
                            <li key={i} className="menu-column__item">{item}</li>
                        ))}
                    </ul>
                </div>
            ))}
             <div className="menu-column">
                <h4 className="menu-column__title">Follow Us</h4>
                <ul className="menu-column__list">
                    <li className="menu-column__item">Instagram</li>
                    <li className="menu-column__item">Twitter</li>
                </ul>
            </div>
        </div>

        {/* NOMINEES GRID */}
        <section className="nominees-section">
            <div className="nominees-title">
                <span>Latest Rooms {isCtrlPressed && "(Delete Mode)"}</span>
                <span>{items.length} Projects</span>
            </div>

            {items.length === 0 ? (
                <div style={{textAlign: 'center', padding: '100px 0', color: '#999'}}>
                    <h2>No rooms available yet.</h2>
                    <p style={{marginTop: 10}}>Press <strong>Ctrl + Q</strong> to add a new room.</p>
                </div>
            ) : (
                <div className="nominees-grid">
                    {items.map((room) => (
                        <ProjectCard 
                            key={room.id} 
                            data={room} 
                            onClick={onSelect}
                            onDelete={onDeleteRoom} 
                        />
                    ))}
                </div>
            )}
        </section>
      </main>
      
      <footer style={{padding: '40px', textAlign: 'center', borderTop: '1px solid #eee', color: '#999', fontSize: '12px'}}>
         &copy; 2025 VR Architecture. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
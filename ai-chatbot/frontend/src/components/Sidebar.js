import React from 'react';
import { MessageSquare, Code, PenTool, LogOut, User } from 'lucide-react';

const PERSONAS = [
  { id: 'default', name: 'Customer Support', icon: MessageSquare, desc: 'Help & Support' },
  { id: 'Coding Tutor', name: 'Coding Tutor', icon: Code, desc: 'Expert Developer' },
  { id: 'Creative Writer', name: 'Creative Writer', icon: PenTool, desc: 'Storyteller & Ideas' }
];

function Sidebar({ currentPersona, setPersona, handleLogout, user }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Nexus AI</h2>
      </div>

      <nav className="personas-nav">
        <h3 className="nav-title">PERSONAS</h3>
        {PERSONAS.map(p => {
          const Icon = p.icon;
          const isActive = currentPersona === p.id;
          return (
            <button
              key={p.id}
              className={`persona-btn ${isActive ? 'active' : ''}`}
              onClick={() => setPersona(p.id)}
            >
              <div className="icon-wrapper"><Icon size={18} /></div>
              <div className="persona-info">
                <span className="persona-name">{p.name}</span>
                <span className="persona-desc">{p.desc}</span>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <User size={20} className="avatar-icon" />
          <span className="username">{user?.username}</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;

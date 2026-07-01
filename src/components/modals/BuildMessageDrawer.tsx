import React from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './BuildMessageDrawer.css';

export const BuildMessageDrawer = () => {
  const { buildMessage, setBuildMessage } = useApp();

  if (buildMessage === null) return null;

  return (
    <div className="build-message-drawer">
      <div className="drawer-header">
        <h3>Build Message</h3>
        <button className="close-btn" onClick={() => setBuildMessage(null)} title="Close">
          <X size={16} />
        </button>
      </div>
      <div className="drawer-content">
        <pre>{buildMessage.replace(/\\n/g, '\n')}</pre>
      </div>
    </div>
  );
};

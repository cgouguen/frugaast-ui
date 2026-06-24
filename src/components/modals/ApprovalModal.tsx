import React from "react";
import { useApp } from "../../context/AppContext";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { ShieldAlert, X } from "lucide-react";
import "./SharedModal.css";
import "./ApprovalModal.css";

export const ApprovalModal = () => {
  const { approvalReq, handleApproval } = useApp();

  useEscapeKey(() => handleApproval(false), !!approvalReq);

  if (!approvalReq) return null;

  return (
    <div className="modal-backdrop" onClick={() => handleApproval(false)}>
      <div className="modal-panel unified-panel" onClick={e => e.stopPropagation()}>
        <div className="unified-header">
          <ShieldAlert size={18} className="unified-icon" />
          <h3>File Access Request</h3>
          <button className="icon-btn-small" onClick={() => handleApproval(false)}>
            <X size={16} />
          </button>
        </div>
        <div className="unified-body">
          <p className="modal-desc">The assistant is requesting to read the following files to gather context:</p>
          <div className="modal-file-list">
            {approvalReq.files.map((f: string, i: number) => <div key={i} className="modal-file-item">{f}</div>)}
          </div>
        </div>
        <div className="unified-footer">
          <button className="btn-secondary" onClick={() => handleApproval(false)}>Deny</button>
          <button className="btn-primary" onClick={() => handleApproval(true)}>Allow Access</button>
        </div>
      </div>
    </div>
  );
};

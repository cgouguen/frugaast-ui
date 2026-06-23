import React from "react";
import { useApp } from "../../context/AppContext";
import { Settings2 } from "lucide-react";
import "./ApprovalModal.css";

export const ApprovalModal = () => {
  const { approvalReq, handleApproval } = useApp();

  if (!approvalReq) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="modal-header">
          <Settings2 size={20} className="modal-icon" />
          <h3>File Access Request</h3>
        </div>
        <p className="modal-desc">The assistant is requesting to read the following files to gather context:</p>
        <div className="modal-file-list">
          {approvalReq.files.map((f: string, i: number) => <div key={i} className="modal-file-item">{f}</div>)}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => handleApproval(false)}>Deny</button>
          <button className="btn-primary" onClick={() => handleApproval(true)}>Allow Access</button>
        </div>
      </div>
    </div>
  );
};

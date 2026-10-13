import React from 'react';
import { DocumentAttachment } from '../types';
import { FileText, Download, X, ExternalLink, HardDrive } from 'lucide-react';

interface PdfViewerModalProps {
  attachment: DocumentAttachment | null;
  onClose: () => void;
  recordTitle?: string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ attachment, onClose, recordTitle }) => {
  if (!attachment) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleDownload = () => {
    if (!attachment.dataUrl) return;
    const a = document.createElement('a');
    a.href = attachment.dataUrl;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenExternal = () => {
    if (!attachment.dataUrl) return;
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${attachment.dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-6 animate-fadeIn">
      <div className="w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-red-900/50 border border-red-700/60 flex items-center justify-center text-red-300">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{attachment.name}</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                  {formatFileSize(attachment.size)}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Linked to {recordTitle || 'Civil Registry Book Index'} • Uploaded by @{attachment.uploadedBy} on{' '}
                {attachment.uploadedAt}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={handleOpenExternal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition cursor-pointer"
              title="Open in new window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>New Window</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Frame */}
        <div className="flex-1 bg-slate-950 p-2 overflow-hidden relative">
          {attachment.dataUrl ? (
            <iframe
              src={attachment.dataUrl}
              title={attachment.name}
              className="w-full h-full rounded-xl border border-slate-800 bg-white"
            />
          ) : (
            <div className="w-full h-full rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center p-6 text-center">
              <FileText className="w-12 h-12 text-slate-500 mb-3" />
              <h4 className="text-sm font-semibold text-white">Document PDF Archived Locally</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-md">
                This document ({formatFileSize(attachment.size)}) exceeds the cloud document limit (1MB) and is archived locally on the workstation where it was registered.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>Encrypted e-Archive Document attached to Civil Registry Book Index</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium transition cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserAccount,
  SiteSettings,
  RegistryCategory,
  AnyRegistryRecord,
  IssuedCertification,
  DocumentAttachment,
} from './types';
import { authService } from './services/auth';
import { storageService } from './services/storage';
import { cloudSyncService, subscribeToCloudSync } from './services/cloudSync';
import { LoginView } from './components/LoginView';
import { Navbar } from './components/Navbar';
import { RecordList } from './components/RecordList';
import { RecordFormModal } from './components/RecordFormModal';
import { RecordDetailModal } from './components/RecordDetailModal';
import { CertificationModal } from './components/CertificationModal';
import { PdfViewerModal } from './components/PdfViewerModal';
import { IssuedCertificationsList } from './components/IssuedCertificationsList';
import { SuperadminControlPanel } from './components/SuperadminControlPanel';
import { CertificateDesigner } from './components/CertificateDesigner';
import { PublicVerificationView } from './components/PublicVerificationView';
import { RegistrationMonthlyChart } from './components/RegistrationMonthlyChart';
import {
  Baby,
  Heart,
  Cross,
  Scroll,
  Award,
  PlusCircle,
  Building2,
  FileText,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => authService.getCurrentUser());
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => storageService.getSettings());
  const [activeCategory, setActiveCategory] = useState<RegistryCategory | 'certifications' | 'settings' | 'certificate-designer'>('births');

  // Registry Records State
  const [records, setRecords] = useState<AnyRegistryRecord[]>([]);
  const [certifications, setCertifications] = useState<IssuedCertification[]>([]);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AnyRegistryRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AnyRegistryRecord | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certSourceRecord, setCertSourceRecord] = useState<AnyRegistryRecord | null>(null);
  const [pdfPreviewAttachment, setPdfPreviewAttachment] = useState<{
    attachment: DocumentAttachment;
    recordTitle: string;
  } | null>(null);

  // Public QR Document Verification State
  const [showPublicVerify, setShowPublicVerify] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.has('verify') || window.location.hash.includes('verify=');
    }
    return false;
  });

  const [verifyInitialCode, setVerifyInitialCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paramVal = params.get('verify');
      if (paramVal) return paramVal;
      const hashMatch = window.location.hash.match(/verify=([^&]+)/);
      if (hashMatch) return decodeURIComponent(hashMatch[1]);
    }
    return '';
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('verify');
      if (code) {
        setVerifyInitialCode(code);
        setShowPublicVerify(true);
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Reload data from storage
  const loadData = useCallback(() => {
    if (activeCategory === 'births') {
      setRecords(storageService.getRecords('births'));
    } else if (activeCategory === 'marriages') {
      setRecords(storageService.getRecords('marriages'));
    } else if (activeCategory === 'deaths') {
      setRecords(storageService.getRecords('deaths'));
    } else if (activeCategory === 'legal-instruments') {
      setRecords(storageService.getRecords('legal-instruments'));
    }
    setCertifications(storageService.getCertifications());
    setSiteSettings(storageService.getSettings());
  }, [activeCategory]);

  useEffect(() => {
    loadData();
    // Initialize cloud synchronization so desktop and mobile share identical real-time data
    cloudSyncService.init();
    const unsubscribe = subscribeToCloudSync(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData]);

  // Handle Logout
  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // Check delete authorization (Superadmin, Admin, MCR, or users with delete permission)
  const canDelete = currentUser
    ? currentUser.role === 'superadmin' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'mcr' ||
      authService.canDelete(currentUser) ||
      !!currentUser.permissions?.canDelete
    : false;

  // In-app deletion confirmation states (replaces iframe-blocked window.confirm)
  const [recordToDelete, setRecordToDelete] = useState<AnyRegistryRecord | null>(null);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<{ category: RegistryCategory; ids: string[] } | null>(null);

  // Open Create Record Modal
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Record Modal
  const handleOpenEdit = (rec: AnyRegistryRecord) => {
    setEditingRecord(rec);
    setViewingRecord(null);
    setIsFormModalOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetail = (rec: AnyRegistryRecord) => {
    setViewingRecord(rec);
  };

  // Open Cert Modal from record
  const handleOpenIssueCert = (rec?: AnyRegistryRecord) => {
    setCertSourceRecord(rec || null);
    setViewingRecord(null);
    setIsCertModalOpen(true);
  };

  // Save Record (Create or Update)
  const handleSaveRecord = (savedRecord: AnyRegistryRecord) => {
    try {
      const operator = currentUser?.username || 'system';
      if (editingRecord) {
        storageService.updateRecord(savedRecord, operator, 'Updated civil registry record');
      } else {
        storageService.addRecord(savedRecord, operator);
      }
      loadData();
      setIsFormModalOpen(false);
      setEditingRecord(null);
    } catch (err: any) {
      console.error('Failed to save record:', err);
      alert(`Error saving record: ${err?.message || 'Unknown error'}`);
    }
  };

  // Delete Record (opens in-app confirmation modal)
  const handleDeleteRecord = (rec: AnyRegistryRecord) => {
    if (!currentUser) return;
    if (!canDelete) {
      alert('Permission Denied: Your account does not have authorization to delete civil registry records.');
      return;
    }
    setRecordToDelete(rec);
  };

  // Confirm Single Record Deletion
  const handleConfirmSingleDelete = () => {
    if (!recordToDelete || !currentUser) return;
    try {
      const authorizedUser: UserAccount = {
        ...currentUser,
        permissions: { ...currentUser.permissions, canDelete: true },
      };
      storageService.deleteRecord(recordToDelete.category, recordToDelete.id, authorizedUser);
      loadData();
      setViewingRecord(null);
      setRecordToDelete(null);
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert(`Error deleting record: ${err?.message || 'Unknown error'}`);
    }
  };

  // Bulk Delete Records (Admin and Superadmin)
  const handleBulkDelete = (category: RegistryCategory, ids: string[]) => {
    if (!currentUser) return;
    if (!canDelete) {
      alert('Permission Denied: Only Admin or Superadmin can bulk delete records.');
      return;
    }
    setBulkDeleteTarget({ category, ids });
  };

  // Confirm Bulk Record Deletion
  const handleConfirmBulkDelete = () => {
    if (!bulkDeleteTarget || !currentUser) return;
    try {
      const authorizedUser: UserAccount = {
        ...currentUser,
        permissions: { ...currentUser.permissions, canDelete: true },
      };
      bulkDeleteTarget.ids.forEach((id) => {
        storageService.deleteRecord(bulkDeleteTarget.category, id, authorizedUser);
      });
      loadData();
      setBulkDeleteTarget(null);
    } catch (err: any) {
      console.error('Bulk delete failed:', err);
      alert(`Error bulk deleting records: ${err?.message || 'Unknown error'}`);
    }
  };

  // Save Issued Certification
  const handleSaveCertification = (cert: IssuedCertification) => {
    storageService.saveCertification(cert);
    setCertifications(storageService.getCertifications());
  };

  // Delete Issued Certification (Superadmin Only)
  const handleDeleteCertification = (cert: IssuedCertification) => {
    if (!currentUser || currentUser.role !== 'superadmin') return;
    storageService.deleteCertification(cert.id, currentUser);
    loadData();
  };

  // Bulk Delete Issued Certifications (Superadmin Only)
  const handleBulkDeleteCertifications = (ids: string[]) => {
    if (!currentUser || currentUser.role !== 'superadmin') return;
    storageService.bulkDeleteCertifications(ids, currentUser);
    loadData();
  };

  // Clear All Issued Certifications (Superadmin Only - training logs cleanup)
  const handleClearAllCertifications = () => {
    if (!currentUser || currentUser.role !== 'superadmin') return;
    storageService.clearAllCertifications(currentUser);
    loadData();
  };

  // Previews PDF
  const handlePreviewPdf = (attachment: DocumentAttachment, recordTitle?: string) => {
    setPdfPreviewAttachment({
      attachment,
      recordTitle: recordTitle || attachment.name,
    });
  };

  // Counts for Stats Pills
  const counts = {
    births: storageService.getRecords('births').length,
    marriages: storageService.getRecords('marriages').length,
    deaths: storageService.getRecords('deaths').length,
    legalInstruments: storageService.getRecords('legal-instruments').length,
    legal: storageService.getRecords('legal-instruments').length,
    certifications: storageService.getCertifications().length,
    certs: storageService.getCertifications().length,
  };

  if (showPublicVerify) {
    return (
      <PublicVerificationView
        initialCode={verifyInitialCode}
        onClose={() => {
          setShowPublicVerify(false);
          setVerifyInitialCode('');
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('verify');
            window.history.replaceState({}, '', url.pathname);
          } catch {}
        }}
      />
    );
  }

  if (!currentUser) {
    return (
      <div className="relative min-h-screen">
        <LoginView onLoginSuccess={(user) => setCurrentUser(user)} />
        <div className="fixed bottom-4 right-4 z-50">
          <button
            type="button"
            onClick={() => setShowPublicVerify(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/90 backdrop-blur hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xl border border-slate-700 transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Public Document Verification Portal</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 flex flex-col lg:flex-row font-sans selection:bg-blue-600 selection:text-white">
      {/* Side Navigational Panel */}
      <Navbar
        currentUser={currentUser}
        siteSettings={siteSettings}
        activeCategory={activeCategory}
        activeTab={activeCategory}
        onSelectCategory={(cat) => setActiveCategory(cat)}
        onTabChange={(tab) => {
          if (tab === 'audit') {
            setActiveCategory('settings');
          } else {
            setActiveCategory(tab);
          }
        }}
        onOpenCreateModal={handleOpenCreate}
        onOpenIssueCert={() => handleOpenIssueCert()}
        onLogout={handleLogout}
        onSignOut={handleLogout}
        counts={counts}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        {/* Top Summary & Stats Banner */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setActiveCategory('births')}
            className={`p-4 rounded-xl border transition text-left cursor-pointer bg-white shadow-sm flex flex-col justify-between ${
              activeCategory === 'births'
                ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Births</span>
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <Baby className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900 font-mono">{counts.births}</span>
            <span className="text-[10px] text-emerald-600 font-bold mt-1">Book Archive Active</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('marriages')}
            className={`p-4 rounded-xl border transition text-left cursor-pointer bg-white shadow-sm flex flex-col justify-between ${
              activeCategory === 'marriages'
                ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Marriages</span>
              <div className="w-6 h-6 rounded-md bg-pink-50 text-pink-600 flex items-center justify-center">
                <Heart className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900 font-mono">{counts.marriages}</span>
            <span className="text-[10px] text-blue-600 font-bold mt-1">Registry Synced</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('deaths')}
            className={`p-4 rounded-xl border transition text-left cursor-pointer bg-white shadow-sm flex flex-col justify-between ${
              activeCategory === 'deaths'
                ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Deaths</span>
              <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                <Cross className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900 font-mono">{counts.deaths}</span>
            <span className="text-[10px] text-slate-500 font-bold mt-1">Verified Entries</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('legal-instruments')}
            className={`p-4 rounded-xl border transition text-left cursor-pointer bg-white shadow-sm flex flex-col justify-between ${
              activeCategory === 'legal-instruments'
                ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Legal Inst.</span>
              <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Scroll className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900 font-mono">{counts.legalInstruments}</span>
            <span className="text-[10px] text-indigo-600 font-bold mt-1">Court & Affidavits</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('certifications')}
            className={`p-4 rounded-xl border transition text-left cursor-pointer bg-white shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1 ${
              activeCategory === 'certifications'
                ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Issued Certs</span>
              <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Award className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-900 font-mono">{counts.certifications}</span>
            <span className="text-[10px] text-emerald-600 font-bold mt-1">LCR Forms 1/2/3</span>
          </button>
        </section>

        {/* Monthly Registrations Bar Chart for selected record category */}
        {activeCategory !== 'settings' && activeCategory !== 'certificate-designer' && (
          <RegistrationMonthlyChart
            category={activeCategory}
            records={records}
            certifications={certifications}
          />
        )}

        {/* Content View Router */}
        {activeCategory === 'certificate-designer' ? (
          <CertificateDesigner
            currentUser={currentUser}
            siteSettings={siteSettings}
            onBackToCertifications={() => setActiveCategory('certifications')}
          />
        ) : activeCategory === 'certifications' ? (
          <IssuedCertificationsList
            certifications={certifications}
            currentUser={currentUser}
            siteSettings={siteSettings}
            onOpenNewCert={() => handleOpenIssueCert()}
            onOpenDesigner={() => setActiveCategory('certificate-designer')}
            onDeleteCertification={handleDeleteCertification}
            onBulkDeleteCertifications={handleBulkDeleteCertifications}
            onClearAllCertifications={handleClearAllCertifications}
          />
        ) : activeCategory === 'settings' ? (
          <SuperadminControlPanel
            currentUser={currentUser}
            siteSettings={siteSettings}
            onUpdateSettings={(newSettings) => setSiteSettings(newSettings)}
            onRefreshData={loadData}
            onOpenDesigner={() => setActiveCategory('certificate-designer')}
          />
        ) : (
          <RecordList
            category={activeCategory}
            records={records}
            currentUser={currentUser}
            canDelete={canDelete}
            onOpenCreate={handleOpenCreate}
            onViewRecord={handleOpenDetail}
            onEditRecord={handleOpenEdit}
            onDeleteRecord={handleDeleteRecord}
            onBulkDeleteRecords={handleBulkDelete}
            onIssueCert={(rec) => handleOpenIssueCert(rec)}
            onPreviewPdf={(att, title) => handlePreviewPdf(att, title)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700">
              {siteSettings.officeName} • {siteSettings.municipality}, {siteSettings.province}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="text-slate-600 font-medium">Civil Registry Information System (CRIS)</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">Republic Act No. 3753</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-mono font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              RBAC Modular Security
            </span>
          </div>
        </div>
      </footer>
      </div>

      {/* MODAL 1: Record Create / Edit Form */}
      <RecordFormModal
        isOpen={isFormModalOpen}
        category={activeCategory === 'certifications' || activeCategory === 'settings' ? 'births' : activeCategory}
        initialRecord={editingRecord}
        currentUser={currentUser}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
      />

      {/* MODAL 2: Record Detail & Version Audit View */}
      <RecordDetailModal
        record={viewingRecord}
        currentUser={currentUser}
        canDelete={canDelete}
        onClose={() => setViewingRecord(null)}
        onEdit={(rec) => handleOpenEdit(rec)}
        onDelete={(rec) => handleDeleteRecord(rec)}
        onIssueCert={(rec) => handleOpenIssueCert(rec)}
        onPreviewPdf={(att) => handlePreviewPdf(att, viewingRecord ? (viewingRecord as any).name || 'Record PDF' : 'PDF')}
      />

      {/* MODAL 3: Official LCR Certification Generator (Form 1, 2, 3 with A, B, C) */}
      <CertificationModal
        isOpen={isCertModalOpen}
        selectedRecord={certSourceRecord}
        currentUser={currentUser}
        siteSettings={siteSettings}
        onClose={() => {
          setIsCertModalOpen(false);
          setCertSourceRecord(null);
        }}
        onSaveCert={handleSaveCertification}
        onOpenDesigner={() => {
          setIsCertModalOpen(false);
          setCertSourceRecord(null);
          setActiveCategory('certificate-designer');
        }}
      />

      {/* MODAL 4: Linked PDF Document Viewer */}
      <PdfViewerModal
        isOpen={Boolean(pdfPreviewAttachment)}
        attachment={pdfPreviewAttachment ? pdfPreviewAttachment.attachment : null}
        recordTitle={pdfPreviewAttachment ? pdfPreviewAttachment.recordTitle : ''}
        onClose={() => setPdfPreviewAttachment(null)}
      />

      {/* MODAL 5: Safe In-App Delete Confirmation Modal (Single or Bulk) */}
      {(recordToDelete || bulkDeleteTarget) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {bulkDeleteTarget ? 'Confirm Bulk Deletion' : 'Confirm Record Deletion'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {bulkDeleteTarget
                      ? `Permanently remove ${bulkDeleteTarget.ids.length} selected records.`
                      : 'Permanently remove this civil registry entry.'}
                  </p>
                </div>
              </div>

              {recordToDelete && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registry Category:</span>
                    <span className="font-semibold text-slate-800 uppercase">{recordToDelete.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registry Number:</span>
                    <span className="font-mono font-bold text-blue-600">{recordToDelete.registryNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Book / Page:</span>
                    <span className="font-mono text-slate-700">
                      Book {recordToDelete.bookNumber || '—'}, Page {recordToDelete.pageNumber || '—'}
                    </span>
                  </div>
                </div>
              )}

              {bulkDeleteTarget && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 mb-3 font-medium">
                  You are about to delete <span className="font-bold">{bulkDeleteTarget.ids.length} records</span> from the{' '}
                  <span className="uppercase font-bold">{bulkDeleteTarget.category}</span> book. This action is permanently audited under your account (@{currentUser?.username}).
                </div>
              )}

              <p className="text-xs text-slate-500 mb-4">
                This action cannot be undone. Are you sure you wish to proceed?
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecordToDelete(null);
                    setBulkDeleteTarget(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={bulkDeleteTarget ? handleConfirmBulkDelete : handleConfirmSingleDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {bulkDeleteTarget
                      ? `Permanently Delete (${bulkDeleteTarget.ids.length})`
                      : 'Permanently Delete'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick QR Verification Access */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setShowPublicVerify(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 backdrop-blur hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-lg border border-slate-700 transition cursor-pointer"
          title="Open Public QR Verification Portal"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">QR Verification Portal</span>
        </button>
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import {
  UserAccount,
  SiteSettings,
  UserRole,
  AuditLogItem,
  McrStaffMember,
} from '../types';
import { storageService } from '../services/storage';
import { formatDateTimeDDMMMYYYY } from '../utils/dateUtils';
import {
  Shield,
  Settings,
  Users,
  Database,
  Key,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ShieldCheck,
  Building,
  Sliders,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SuperadminControlPanelProps {
  currentUser: UserAccount;
  siteSettings: SiteSettings;
  onUpdateSettings: (settings: SiteSettings) => void;
  onRefreshData: () => void;
  onOpenDesigner?: () => void;
}

export const SuperadminControlPanel: React.FC<SuperadminControlPanelProps> = ({
  currentUser,
  siteSettings,
  onUpdateSettings,
  onRefreshData,
  onOpenDesigner,
}) => {
  const isSuperadmin = currentUser.role === 'superadmin';
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'backup' | 'api' | 'audit'>('settings');

  // Site Settings Form State
  const [lguName, setLguName] = useState(siteSettings.lguName);
  const [province, setProvince] = useState(siteSettings.province);
  const [municipality, setMunicipality] = useState(siteSettings.municipality);
  const [officeName, setOfficeName] = useState(siteSettings.officeName);
  const [mcrOfficerName, setMcrOfficerName] = useState(siteSettings.mcrOfficerName);
  const [mcrOfficerTitle, setMcrOfficerTitle] = useState(siteSettings.mcrOfficerTitle);
  const [assistantMcrName, setAssistantMcrName] = useState(siteSettings.assistantMcrName);
  const [assistantMcrTitle, setAssistantMcrTitle] = useState(siteSettings.assistantMcrTitle);
  const [defaultOrFee, setDefaultOrFee] = useState(siteSettings.defaultOrFee);
  const [sealText, setSealText] = useState(siteSettings.sealText);
  const [contactEmail, setContactEmail] = useState(siteSettings.contactEmail);
  const [contactPhone, setContactPhone] = useState(siteSettings.contactPhone);
  const [geminiApiKey, setGeminiApiKey] = useState(siteSettings.geminiApiKey || '');

  // Multiple MCR Staff Verifiers for Form Printing
  const [mcrStaffList, setMcrStaffList] = useState<McrStaffMember[]>(() => {
    if (siteSettings.mcrStaff && siteSettings.mcrStaff.length > 0) {
      return siteSettings.mcrStaff;
    }
    const initial: McrStaffMember[] = [];
    if (siteSettings.assistantMcrName) {
      initial.push({
        id: 'staff-default-1',
        name: siteSettings.assistantMcrName,
        title: siteSettings.assistantMcrTitle || 'Registration Officer II / Assistant MCR',
        isDefault: true,
      });
    }
    return initial;
  });
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffTitle, setNewStaffTitle] = useState('');
  const [newStaffIsDefault, setNewStaffIsDefault] = useState(false);

  // User Management State
  const [users, setUsers] = useState<UserAccount[]>(storageService.getUsers(currentUser));
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('clerk');
  const [newCanDelete, setNewCanDelete] = useState(false);

  // Status feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Audit Log Management (Superadmin Only)
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [logToDelete, setLogToDelete] = useState<AuditLogItem | null>(null);
  const [showClearLogsConfirm, setShowClearLogsConfirm] = useState(false);

  const handleDeleteLog = (logItem: AuditLogItem) => {
    if (!isSuperadmin) {
      setFeedback({ type: 'error', message: 'Unauthorized: Audit trail logs can only be deleted by Superadmin.' });
      return;
    }
    const currentLogs = storageService.getAuditLogs();
    const updated = currentLogs.filter((l) => l.id !== logItem.id);
    localStorage.setItem('cris_audit_v1', JSON.stringify(updated));
    setAuditRefreshKey((k) => k + 1);
    setLogToDelete(null);
    setFeedback({ type: 'success', message: `Audit log [${logItem.id}] permanently deleted by Superadmin.` });
    onRefreshData();
  };

  const handleClearAllLogs = () => {
    if (!isSuperadmin) {
      setFeedback({ type: 'error', message: 'Unauthorized: Audit trail logs can only be deleted by Superadmin.' });
      return;
    }
    const resetLog: AuditLogItem = {
      id: 'audit-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      username: currentUser.username,
      action: 'DELETE',
      category: 'SYSTEM',
      description: `Audit trail history cleared and reset by Superadmin @${currentUser.username}`,
    };
    localStorage.setItem('cris_audit_v1', JSON.stringify([resetLog]));
    setAuditRefreshKey((k) => k + 1);
    setShowClearLogsConfirm(false);
    setFeedback({ type: 'success', message: 'All historical audit logs have been cleared by Superadmin.' });
    onRefreshData();
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SiteSettings = {
      lguName: lguName.toUpperCase(),
      province: province.toUpperCase(),
      municipality: municipality.toUpperCase(),
      officeName: officeName.toUpperCase(),
      mcrOfficerName: mcrOfficerName.toUpperCase(),
      mcrOfficerTitle,
      assistantMcrName: assistantMcrName.toUpperCase(),
      assistantMcrTitle,
      mcrStaff: mcrStaffList,
      defaultOrFee,
      sealText: sealText.toUpperCase(),
      contactEmail,
      contactPhone,
      geminiApiKey: geminiApiKey.trim(),
    };
    storageService.saveSettings(updated);
    if (mcrOfficerName.trim()) {
      storageService.rememberPersonnel({
        name: mcrOfficerName.toUpperCase().trim(),
        designation: mcrOfficerTitle.toUpperCase().trim() || 'MUNICIPAL CIVIL REGISTRAR',
        roleType: 'mcr',
        addressOrAffiliation: `${municipality.toUpperCase()}, ${province.toUpperCase()}`,
      });
    }
    if (assistantMcrName.trim()) {
      storageService.rememberPersonnel({
        name: assistantMcrName.toUpperCase().trim(),
        designation: assistantMcrTitle.toUpperCase().trim() || 'ASST. REGISTRATION OFFICER',
        roleType: 'mcr',
        addressOrAffiliation: `${municipality.toUpperCase()}, ${province.toUpperCase()}`,
      });
    }
    mcrStaffList.forEach((staff) => {
      if (staff.name.trim()) {
        storageService.rememberPersonnel({
          name: staff.name.toUpperCase().trim(),
          designation: staff.title.trim() || 'MCR STAFF / VERIFIER',
          roleType: 'mcr',
          addressOrAffiliation: `${municipality.toUpperCase()}, ${province.toUpperCase()}`,
        });
      }
    });
    onUpdateSettings(updated);
    setFeedback({ type: 'success', message: 'Civil Registry site configuration successfully updated!' });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleAddStaffMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) {
      setFeedback({ type: 'error', message: 'Staff name is required.' });
      return;
    }
    const title = newStaffTitle.trim() || 'Registration Staff / Verifier';
    const isFirst = mcrStaffList.length === 0;
    const shouldBeDefault = newStaffIsDefault || isFirst;

    const newMember: McrStaffMember = {
      id: `mcr-staff-${Date.now()}`,
      name: newStaffName.toUpperCase().trim(),
      title,
      isDefault: shouldBeDefault,
    };

    const updatedList = shouldBeDefault
      ? mcrStaffList.map((s) => ({ ...s, isDefault: false }))
      : [...mcrStaffList];

    setMcrStaffList([...updatedList, newMember]);
    setNewStaffName('');
    setNewStaffTitle('');
    setNewStaffIsDefault(false);
    setFeedback({ type: 'success', message: `Added MCR Staff "${newMember.name}" for forms verification.` });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRemoveStaffMember = (id: string) => {
    const updated = mcrStaffList.filter((s) => s.id !== id);
    if (updated.length > 0 && !updated.some((s) => s.isDefault)) {
      updated[0].isDefault = true;
    }
    setMcrStaffList(updated);
  };

  const handleSetDefaultStaff = (id: string) => {
    const updated = mcrStaffList.map((s) => ({
      ...s,
      isDefault: s.id === id,
    }));
    setMcrStaffList(updated);
  };

  // Add new user (RBAC)
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      setFeedback({ type: 'error', message: 'Username, password, and staff full name are required.' });
      return;
    }

    const allUsers = storageService.getUsersRaw();
    if (allUsers.some((u) => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      setFeedback({ type: 'error', message: 'An account with that username already exists.' });
      return;
    }

    const newUser: UserAccount = {
      id: 'usr-' + Date.now(),
      username: newUsername.trim().toLowerCase(),
      password: newPassword.trim(),
      name: newName.trim().toUpperCase(),
      email: newEmail.trim().toLowerCase(),
      number: newNumber.trim(),
      role: newRole,
      permissions: {
        canCreate: true,
        canEdit: true,
        canDelete: newRole === 'superadmin' || newRole === 'mcr' ? true : newCanDelete,
        canIssueCert: true,
        canConfigureSettings: newRole === 'superadmin' || newRole === 'mcr',
        canManageUsers: newRole === 'superadmin' || newRole === 'mcr',
        canBackup: newRole === 'superadmin' || newRole === 'mcr',
      },
      isSuperadminInvisible: false,
      createdAt: new Date().toISOString(),
    };

    allUsers.push(newUser);
    storageService.saveUsers(allUsers);
    setUsers(storageService.getUsers(currentUser));

    setNewUsername('');
    setNewPassword('');
    setNewName('');
    setNewEmail('');
    setNewNumber('');
    setNewRole('clerk');
    setNewCanDelete(false);

    setFeedback({ type: 'success', message: `Staff user @${newUser.username} registered with role ${newUser.role.toUpperCase()}.` });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Toggle user delete permission
  const handleToggleUserPermission = (userId: string, permissionKey: keyof UserAccount['permissions']) => {
    const allUsers = storageService.getUsersRaw();
    const updated = allUsers.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          permissions: {
            ...u.permissions,
            [permissionKey]: !u.permissions[permissionKey],
          },
        };
      }
      return u;
    });
    storageService.saveUsers(updated);
    setUsers(storageService.getUsers(currentUser));
  };

  // Delete user
  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser.id) {
      setFeedback({ type: 'error', message: 'You cannot delete your own active account.' });
      return;
    }
    const allUsers = storageService.getUsersRaw().filter((u) => u.id !== userId);
    storageService.saveUsers(allUsers);
    setUsers(storageService.getUsers(currentUser));
    setFeedback({ type: 'success', message: 'Staff account removed from system.' });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Backup Export
  const handleDownloadBackup = () => {
    const jsonStr = storageService.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CRIS_FULL_BACKUP_${siteSettings.municipality}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback({ type: 'success', message: 'CRIS database backup file generated and downloaded successfully.' });
  };

  // Backup Import
  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const res = storageService.importBackup(content, currentUser);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        onRefreshData();
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    };
    reader.readAsText(file);
  };

  // Factory Reset
  const handleFactoryReset = () => {
    if (window.confirm('Are you sure you want to reset all records and settings to initial factory demo data? This action cannot be undone.')) {
      storageService.resetFactoryData(currentUser);
      onRefreshData();
      setFeedback({ type: 'success', message: 'CRIS system data reset to initial factory state.' });
    }
  };

  const auditLogs = storageService.getAuditLogs();

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{isSuperadmin ? 'Superadmin Control Panel' : 'MCR Office Settings & Backup'}</span>
                <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-mono font-bold">
                  {currentUser.role.toUpperCase()}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Configure Municipal Civil Registry parameters, manage staff roles and modular delete permissions, export/restore backups.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDesigner && (
              <button
                type="button"
                onClick={onOpenDesigner}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 shadow-xs transition cursor-pointer"
                title="Open Drag-and-Drop Certificate Designer for Forms 1x, 2x, 3x"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Certificate Designer</span>
              </button>
            )}
            <button
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Quick Backup</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Sub-Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center space-x-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Civil Registry Office & Signatories</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff & Modular RBAC ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>System Backup & Restore</span>
          </button>

          {isSuperadmin && (
            <button
              onClick={() => setActiveTab('api')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'api'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Set API & AI OCR</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Trail Log</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Site Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              Local Government Unit & LCR Office Particulars
            </h3>
            <p className="text-xs text-slate-500">
              These details appear on all generated certifications (LCR Forms 1A/B/C, 2A/B/C, 3A/B/C) and print headers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Municipality / City</label>
              <input
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Province</label>
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">LGU Formal Name</label>
              <input
                type="text"
                value={lguName}
                onChange={(e) => setLguName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Office Header Title</label>
            <input
              type="text"
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Official Signatories
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Municipal Civil Registrar (MCR) Name
                </label>
                <input
                  type="text"
                  value={mcrOfficerName}
                  onChange={(e) => setMcrOfficerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">MCR Official Title</label>
                <input
                  type="text"
                  value={mcrOfficerTitle}
                  onChange={(e) => setMcrOfficerTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assistant MCR / Officer</label>
                <input
                  type="text"
                  value={assistantMcrName}
                  onChange={(e) => setAssistantMcrName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assistant Title</label>
                <input
                  type="text"
                  value={assistantMcrTitle}
                  onChange={(e) => setAssistantMcrTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Multiple Authorized MCR Staff Verifiers for Form Printing */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                <div>
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    Authorized MCR Staff / Verifiers ({mcrStaffList.length})
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    Configure multiple MCR staff members to verify and co-sign printed civil registry forms and certifications.
                  </p>
                </div>
              </div>

              {/* Staff List */}
              <div className="space-y-2 mb-3">
                {mcrStaffList.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center">
                    No additional MCR Staff verifiers configured yet. Add staff below to include in printed forms.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {mcrStaffList.map((staff) => (
                      <div
                        key={staff.id}
                        className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 uppercase truncate">{staff.name}</span>
                            {staff.isDefault && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-800 rounded">
                                Default Verifier
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-600 truncate">{staff.title}</div>
                        </div>
                        <div className="flex items-center gap-1.5 ml-2">
                          {!staff.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultStaff(staff.id)}
                              className="px-2 py-1 text-[10px] text-slate-600 bg-white border border-slate-200 hover:text-blue-600 hover:border-blue-300 rounded font-medium transition-colors cursor-pointer"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveStaffMember(staff.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Remove staff verifier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New MCR Staff Inputs */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[11px] font-bold text-slate-700 uppercase mb-2">Add New MCR Staff Verifier</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="STAFF FULL NAME (e.g. MARIA ELENA SANTOS)"
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newStaffTitle}
                    onChange={(e) => setNewStaffTitle(e.target.value)}
                    placeholder="OFFICIAL TITLE (e.g. Registration Officer I)"
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffIsDefault}
                      onChange={(e) => setNewStaffIsDefault(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 mr-1.5 focus:ring-blue-500"
                    />
                    Set as default verifier for forms
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStaffMember}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Staff
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Default Certification Fee (₱)</label>
              <input
                type="text"
                value={defaultOrFee}
                onChange={(e) => setDefaultOrFee(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Contact Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Configuration Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Staff & Modular RBAC */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Add Staff Account Form */}
          <form onSubmit={handleCreateUser} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Create Staff / Registrar Account
                </h3>
                <p className="text-xs text-slate-500">
                  Self-registration is disabled. Add authorized civil registry staff with granular delete rights.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Staff Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="JUAN DELA CRUZ"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="jdelacruz"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Initial password"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="jdelacruz@culaba.gov.ph"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone Number</label>
                <input
                  type="text"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="09171234567"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="clerk">Registration Clerk (Standard)</option>
                  <option value="mcr">Municipal Civil Registrar (MCR)</option>
                  {isSuperadmin && <option value="superadmin">Superadmin</option>}
                </select>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="can-delete-checkbox"
                  checked={newRole === 'mcr' || newRole === 'superadmin' ? true : newCanDelete}
                  disabled={newRole === 'mcr' || newRole === 'superadmin'}
                  onChange={(e) => setNewCanDelete(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="can-delete-checkbox" className="text-xs font-medium text-slate-700">
                  Grant Record Deletion Permission (Modular RBAC)
                </label>
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Staff Account</span>
              </button>
            </div>
          </form>

          {/* Existing Users Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Authorized Personnel ({users.length})
              </h4>
              <span className="text-[11px] text-slate-500">
                {isSuperadmin
                  ? '🔒 Superadmin mode: All accounts visible'
                  : '🔒 Normal view: Superadmin is invisible'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase">
                    <th className="py-2.5 px-4">Staff Name & Username</th>
                    <th className="py-2.5 px-4">Contact (Email / Phone)</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4 text-center">Can Delete?</th>
                    <th className="py-2.5 px-4 text-center">Can Config?</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <span className="font-sans font-bold text-slate-900 block">{u.name}</span>
                          <span className="text-slate-500 text-[11px]">@{u.username}</span>
                        </td>

                        <td className="py-3 px-4 text-[11px] text-slate-600">
                          <div>{u.email || 'N/A'}</div>
                          <div className="text-slate-400">{u.number || 'N/A'}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              u.role === 'superadmin'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : u.role === 'mcr'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {u.role === 'superadmin' || u.role === 'mcr' ? (
                            <span className="text-emerald-700 font-bold text-xs">YES (Default)</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleUserPermission(u.id, 'canDelete')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer border ${
                                u.permissions.canDelete
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {u.permissions.canDelete ? 'ENABLED' : 'DISABLED'}
                            </button>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center text-slate-500">
                          {u.role === 'superadmin' || u.role === 'mcr' ? 'YES' : 'NO'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {!isSelf && u.role !== 'superadmin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="Delete staff account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: System Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              Civil Registry Database Backup & Archival Snapshot
            </h3>
            <p className="text-xs text-slate-500">
              Export comprehensive JSON backups of all registered books (Births, Marriages, Deaths, Legal Instruments),
              issued certifications, attached PDF documents, and system audit logs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
                <Download className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Full System Backup Export</h4>
              <p className="text-xs text-slate-500">
                Downloads an encrypted, human-readable snapshot of every registry index and certification issued in
                this LGU.
              </p>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Backup File (.json)</span>
              </button>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                <Upload className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Restore Database from Backup</h4>
              <p className="text-xs text-slate-500">
                Upload a previously exported CRIS backup file to restore all books, registry coordinates, and
                certifications.
              </p>
              <input
                type="file"
                ref={backupFileInputRef}
                onChange={handleUploadBackup}
                accept="application/json,.json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => backupFileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Select & Restore Backup File</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-rose-800 block">Factory Sample Data Reset</span>
              <span className="text-[11px] text-slate-500">
                Restores standard Philippine sample books for testing and demonstration.
              </span>
            </div>
            <button
              type="button"
              onClick={handleFactoryReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Sample Data</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: API Configuration & Gemini OCR */}
      {activeTab === 'api' && isSuperadmin && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              Gemini AI & Document OCR Configuration
            </h3>
            <p className="text-xs text-slate-500">
              Configure Google Gemini API integration for automated scanned certificate OCR and smart transcription into
              registry indices.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Gemini API Key (Server & Client Environment)
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const updated = { ...siteSettings, geminiApiKey: geminiApiKey.trim() };
                  storageService.saveSettings(updated);
                  onUpdateSettings(updated);
                  setFeedback({ type: 'success', message: 'Gemini API credentials successfully saved.' });
                  setTimeout(() => setFeedback(null), 3000);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
              >
                Save Key
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              The system utilizes the Gemini API for intelligent handwriting and printed document recognition of
              historical civil registry archives.
            </p>
          </div>
        </div>
      )}

      {/* TAB 5: Audit Trail Log */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Immutable Civil Registry Audit Trail ({auditLogs.length} events logged)
              </h4>
              <span className="text-[11px] text-slate-500 font-mono font-medium">Real-time Timestamped</span>
            </div>
            {isSuperadmin && (
              <button
                type="button"
                onClick={() => setShowClearLogsConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer"
                title="Superadmin Privilege: Clear Audit Trail History"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Audit Logs</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Officer</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Description</th>
                  {isSuperadmin && <th className="py-2.5 px-4 text-right">Delete</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {formatDateTimeDDMMMYYYY(log.timestamp)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'CREATE'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : log.action === 'UPDATE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : log.action === 'DELETE'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : log.action === 'ISSUE_CERT'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">@{log.username}</td>
                    <td className="py-2.5 px-4 text-slate-500 uppercase text-[11px]">{log.category || 'SYSTEM'}</td>
                    <td className="py-2.5 px-4 text-slate-700 font-sans text-xs">{log.description}</td>
                    {isSuperadmin && (
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setLogToDelete(log)}
                          title="Delete this audit log entry (Superadmin only)"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Superadmin Audit Trail Log Deletion Confirmation Modal */}
      {(logToDelete || showClearLogsConfirm) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden font-sans">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {showClearLogsConfirm ? 'Clear Audit Trail History' : 'Delete Audit Log Entry'}
                  </h3>
                  <p className="text-xs text-slate-500">Superadmin Privilege Only</p>
                </div>
              </div>

              {logToDelete && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 mb-3 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Action:</span>
                    <span className="font-bold text-slate-800">{logToDelete.action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Officer:</span>
                    <span className="font-semibold text-slate-800">@{logToDelete.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timestamp:</span>
                    <span className="text-slate-600">{formatDateTimeDDMMMYYYY(logToDelete.timestamp)}</span>
                  </div>
                  <div className="mt-1 text-slate-600 font-sans italic">"{logToDelete.description}"</div>
                </div>
              )}

              {showClearLogsConfirm && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 mb-3 font-medium">
                  Warning: You are about to clear all {auditLogs.length} audit trail log records. This operation is restricted to Superadmin. A single new reset entry will be created.
                </div>
              )}

              <p className="text-xs text-slate-500 mb-4">
                Are you sure you want to permanently delete this audit trail data?
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLogToDelete(null);
                    setShowClearLogsConfirm(false);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={showClearLogsConfirm ? handleClearAllLogs : () => logToDelete && handleDeleteLog(logToDelete)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{showClearLogsConfirm ? 'Permanently Clear Audit Trail' : 'Permanently Delete Log'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

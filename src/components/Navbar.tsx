import React, { useState } from 'react';
import { UserAccount, RegistryCategory, SiteSettings } from '../types';
import {
  FileText,
  LogOut,
  Shield,
  Settings,
  Baby,
  Heart,
  Cross,
  Scroll,
  Award,
  PlusCircle,
  Database,
  Menu,
  X,
  Stamp,
  Cloud,
} from 'lucide-react';

interface NavbarProps {
  currentUser: UserAccount;
  activeCategory?: RegistryCategory | 'certifications' | 'settings' | 'certificate-designer';
  activeTab?: RegistryCategory | 'certifications' | 'settings' | 'audit' | 'certificate-designer';
  onSelectCategory?: (category: RegistryCategory | 'certifications' | 'settings' | 'certificate-designer') => void;
  onTabChange?: (tab: RegistryCategory | 'certifications' | 'settings' | 'audit' | 'certificate-designer') => void;
  onOpenCreateModal?: () => void;
  onOpenIssueCert?: () => void;
  onLogout?: () => void;
  onSignOut?: () => void;
  siteSettings: SiteSettings;
  counts?: {
    births?: number;
    marriages?: number;
    deaths?: number;
    legal?: number;
    legalInstruments?: number;
    certs?: number;
    certifications?: number;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeCategory,
  activeTab,
  onSelectCategory,
  onTabChange,
  onOpenCreateModal,
  onOpenIssueCert,
  onLogout,
  onSignOut,
  siteSettings,
  counts,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const currentTab = activeTab || activeCategory || 'births';

  const handleTabClick = (tab: RegistryCategory | 'certifications' | 'settings' | 'audit' | 'certificate-designer') => {
    if (onTabChange) {
      onTabChange(tab);
    }
    if (onSelectCategory) {
      if (tab === 'audit') {
        onSelectCategory('settings');
      } else {
        onSelectCategory(tab);
      }
    }
    setIsMobileOpen(false);
  };

  const handleSignOut = () => {
    if (onSignOut) onSignOut();
    else if (onLogout) onLogout();
  };

  const handleCreate = () => {
    if (onOpenCreateModal) onOpenCreateModal();
    else if (onOpenIssueCert) onOpenIssueCert();
    setIsMobileOpen(false);
  };

  const handleIssueCert = () => {
    if (onOpenIssueCert) onOpenIssueCert();
    setIsMobileOpen(false);
  };

  const safeCounts = {
    births: counts?.births ?? 0,
    marriages: counts?.marriages ?? 0,
    deaths: counts?.deaths ?? 0,
    legal: counts?.legal ?? counts?.legalInstruments ?? 0,
    certs: counts?.certs ?? counts?.certifications ?? 0,
  };

  const canManageSettings =
    currentUser.role === 'superadmin' || currentUser.role === 'mcr' || currentUser.permissions.canConfigureSettings;

  const renderNavContent = () => (
    <div className="flex flex-col h-full justify-between">
      {/* Top Branding */}
      <div className="p-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md font-bold shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">
                CIVIL REGISTRY
              </h1>
              <span className="text-[9px] text-blue-400 bg-blue-950/80 border border-blue-800 px-1 py-0.2 rounded font-mono font-semibold">
                CRIS v4.0
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-300 truncate mt-0.5">
              {siteSettings.municipality}, {siteSettings.province}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">
              {siteSettings.officeName}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/40 text-[9px] text-emerald-300 font-mono">
              <Cloud className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">Cloud Sync: Live (Desktop & Mobile)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          <button
            type="button"
            id="navbar-create-record-btn"
            onClick={handleCreate}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>+ NEW REGISTRY RECORD</span>
          </button>

          {onOpenIssueCert && (
            <button
              type="button"
              onClick={handleIssueCert}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-800 hover:text-white border border-slate-700/80 text-emerald-400 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              <Stamp className="w-3.5 h-3.5 shrink-0" />
              <span>ISSUE CERTIFICATION</span>
            </button>
          )}
        </div>
      </div>

      {/* Nav Menu Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Group 1: Civil Registries */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 mb-1.5 block">
            Civil Registries
          </span>
          <div className="space-y-1">
            <button
              type="button"
              id="nav-tab-births"
              onClick={() => handleTabClick('births')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentTab === 'births'
                  ? 'bg-blue-600/20 text-white border-l-3 border-blue-500 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Baby className={`w-4 h-4 ${currentTab === 'births' ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>Birth Registry</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-blue-400/90 font-mono hidden xl:inline">Form 1x</span>
                <span className="text-[10px] bg-slate-800/90 text-slate-300 px-1.5 py-0.2 rounded font-mono font-bold">
                  {safeCounts.births}
                </span>
              </div>
            </button>

            <button
              type="button"
              id="nav-tab-deaths"
              onClick={() => handleTabClick('deaths')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentTab === 'deaths'
                  ? 'bg-blue-600/20 text-white border-l-3 border-blue-500 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Cross className={`w-4 h-4 ${currentTab === 'deaths' ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>Death Registry</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-amber-400/90 font-mono hidden xl:inline">Form 2x</span>
                <span className="text-[10px] bg-slate-800/90 text-slate-300 px-1.5 py-0.2 rounded font-mono font-bold">
                  {safeCounts.deaths}
                </span>
              </div>
            </button>

            <button
              type="button"
              id="nav-tab-marriages"
              onClick={() => handleTabClick('marriages')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentTab === 'marriages'
                  ? 'bg-blue-600/20 text-white border-l-3 border-blue-500 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Heart className={`w-4 h-4 ${currentTab === 'marriages' ? 'text-pink-400' : 'text-slate-400'}`} />
                <span>Marriage Registry</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-pink-400/90 font-mono hidden xl:inline">Form 3x</span>
                <span className="text-[10px] bg-slate-800/90 text-slate-300 px-1.5 py-0.2 rounded font-mono font-bold">
                  {safeCounts.marriages}
                </span>
              </div>
            </button>

            <button
              type="button"
              id="nav-tab-legal"
              onClick={() => handleTabClick('legal-instruments')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentTab === 'legal-instruments'
                  ? 'bg-blue-600/20 text-white border-l-3 border-blue-500 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Scroll className={`w-4 h-4 ${currentTab === 'legal-instruments' ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>Legal Instruments</span>
              </div>
              <span className="text-[10px] bg-slate-800/90 text-slate-300 px-1.5 py-0.2 rounded font-mono font-bold">
                {safeCounts.legal}
              </span>
            </button>
          </div>
        </div>

        {/* Group 2: Document Certification */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 mb-1.5 block">
            Certifications
          </span>
          <div className="space-y-1">
            <button
              type="button"
              id="nav-tab-certs"
              onClick={() => handleTabClick('certifications')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentTab === 'certifications'
                  ? 'bg-blue-600/20 text-white border-l-3 border-blue-500 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Award className={`w-4 h-4 ${currentTab === 'certifications' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>Issued Certifications</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-emerald-400 font-mono hidden xl:inline">LCR 1/2/3</span>
                <span className="text-[10px] bg-slate-800/90 text-slate-300 px-1.5 py-0.2 rounded font-mono font-bold">
                  {safeCounts.certs}
                </span>
              </div>
            </button>

            <button
              type="button"
              id="nav-tab-designer"
              onClick={() => handleTabClick('certificate-designer')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentTab === 'certificate-designer'
                  ? 'bg-blue-600/20 text-white border-l-3 border-blue-500 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Stamp className={`w-4 h-4 ${currentTab === 'certificate-designer' ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>Certificate Designer</span>
              </div>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                1x, 2x, 3x
              </span>
            </button>
          </div>
        </div>

        {/* Group 3: Administration & Logs */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 mb-1.5 block">
            Administration
          </span>
          <div className="space-y-1">
            {canManageSettings && (
              <button
                type="button"
                id="nav-tab-settings"
                onClick={() => handleTabClick('settings')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  currentTab === 'settings'
                    ? 'bg-blue-600/20 text-white border-l-3 border-blue-500 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {currentUser.role === 'superadmin' ? (
                    <Shield className={`w-4 h-4 ${currentTab === 'settings' ? 'text-purple-400' : 'text-slate-400'}`} />
                  ) : (
                    <Settings className={`w-4 h-4 ${currentTab === 'settings' ? 'text-blue-400' : 'text-slate-400'}`} />
                  )}
                  <span className="truncate">
                    {currentUser.role === 'superadmin' ? 'Superadmin Control' : 'System Settings'}
                  </span>
                </div>
              </button>
            )}

            <button
              type="button"
              id="nav-tab-audit"
              onClick={() => handleTabClick('audit')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentTab === 'audit'
                  ? 'bg-blue-600/20 text-white border-l-3 border-blue-500 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Database className={`w-4 h-4 ${currentTab === 'audit' ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>Audit Logs Trail</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* User Status & Sign Out Footer */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-200 truncate uppercase">{currentUser.name}</span>
                <span
                  className={`text-[8px] px-1 py-0.2 rounded font-mono uppercase font-bold shrink-0 ${
                    currentUser.role === 'superadmin'
                      ? 'bg-purple-950 text-purple-300 border border-purple-700'
                      : currentUser.role === 'mcr'
                      ? 'bg-blue-950 text-blue-300 border border-blue-700'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                @{currentUser.username}
              </div>
            </div>
          </div>

          <button
            type="button"
            id="navbar-signout-btn"
            onClick={handleSignOut}
            title="Sign out of CRIS"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Side Navigational Panel (Sticky, Left side) */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 bg-[#0F172A] border-r border-slate-800 text-slate-300 min-h-screen sticky top-0 h-screen z-30 shadow-md">
        {renderNavContent()}
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#0F172A] border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            aria-label="Open side navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-bold text-white tracking-tight leading-none">CIVIL REGISTRY</h1>
                <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400 font-mono">
                  <Cloud className="w-2.5 h-2.5 text-emerald-400" />
                  Live
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{siteSettings.municipality}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleCreate}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg shadow-sm transition cursor-pointer"
          >
            + NEW
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Side Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-[#0F172A] border-r border-slate-800 shadow-2xl flex flex-col h-full z-10 animate-fadeIn">
            <div className="absolute top-3 right-3">
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  );
};


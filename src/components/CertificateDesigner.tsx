import React, { useState, useEffect, useRef } from 'react';
import {
  MunicipalCertificateTemplate,
  CertificateLayoutBlock,
  LcrFormType,
  LcrFormLetter,
  SiteSettings,
  UserAccount,
} from '../types';
import {
  CERTIFICATE_PLACEHOLDERS,
  PlaceholderDefinition,
  replacePlaceholders,
} from '../services/templates';
import { storageService } from '../services/storage';
import { WysiwygTemplateBuilder } from './WysiwygTemplateBuilder';
import { QrCodeSvg, generateQrSvgString } from './PublicVerificationView';
import {
  GripVertical,
  MoveUp,
  MoveDown,
  Eye,
  EyeOff,
  Printer,
  RotateCcw,
  Save,
  Download,
  Upload,
  Type,
  Sparkles,
  Sliders,
  CheckCircle2,
  X,
  Baby,
  Cross,
  Heart,
  QrCode,
  Building2,
  Shield,
  Layers,
  Copy,
  Plus,
  Trash2,
  Maximize2,
  FileText,
  Info,
  MousePointerClick,
  Edit3,
  ChevronDown,
} from 'lucide-react';

interface CertificateDesignerProps {
  currentUser: UserAccount;
  siteSettings: SiteSettings;
  onBackToCertifications?: () => void;
  initialFormType?: LcrFormType;
  initialFormLetter?: LcrFormLetter;
}

export const CertificateDesigner: React.FC<CertificateDesignerProps> = ({
  currentUser,
  siteSettings,
  onBackToCertifications,
  initialFormType = 'LCR_FORM_1' as LcrFormType,
  initialFormLetter = 'A' as LcrFormLetter,
}) => {
  const [selectedFormType, setSelectedFormType] = useState<LcrFormType>(initialFormType);
  const [selectedFormLetter, setSelectedFormLetter] = useState<LcrFormLetter>(initialFormLetter);

  // Active Template State
  const [template, setTemplate] = useState<MunicipalCertificateTemplate>(() =>
    storageService.getCertificateTemplate(initialFormType as LcrFormType, initialFormLetter as LcrFormLetter)
  );

  // Designer Mode: 'wysiwyg' (freeform document builder matching user screenshot) vs 'blocks' (modular block-based inspector)
  const [designerMode, setDesignerMode] = useState<'wysiwyg' | 'blocks'>('wysiwyg');

  // Active Editor Tab
  const [activeEditorTab, setActiveEditorTab] = useState<'layout' | 'header' | 'logos' | 'watermark' | 'footer' | 'placeholders'>('layout');

  // Preview Mode: 'sample' (filled sample data) vs 'raw' (tokens like {{PERSON_NAME}})
  const [previewMode, setPreviewMode] = useState<'sample' | 'raw'>('sample');

  // Canvas Interaction Mode: 'interactive' (click-to-edit canvas with active frames) vs 'preview' (clean paper view)
  const [canvasInteractionMode, setCanvasInteractionMode] = useState<'interactive' | 'preview'>('interactive');

  // Inline editing block ID for direct canvas text modification
  const [inlineEditingBlockId, setInlineEditingBlockId] = useState<string | null>(null);

  // Add block preset menu state
  const [showAddBlockMenu, setShowAddBlockMenu] = useState<boolean>(false);

  // Drag & drop state for layout blocks
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const [dragOverBlockIndex, setDragOverBlockIndex] = useState<number | null>(null);

  // Selected block for styling inspection
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('block-header');

  // Notification Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // File input ref for custom logo or imported template
  const logoInputRef = useRef<HTMLInputElement>(null);
  const templateImportRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Show Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Switch Form Type & Letter
  useEffect(() => {
    const loaded = storageService.getCertificateTemplate(selectedFormType, selectedFormLetter);
    setTemplate(JSON.parse(JSON.stringify(loaded)));
  }, [selectedFormType, selectedFormLetter]);

  // Handle Save Template
  const handleSaveTemplate = () => {
    storageService.saveCertificateTemplate(template, currentUser);
    showToast(`Template saved successfully for ${template.name}!`);
  };

  // Handle Reset to Default
  const handleResetToDefault = () => {
    const fresh = storageService.resetCertificateTemplate(selectedFormType, selectedFormLetter, currentUser);
    setTemplate(JSON.parse(JSON.stringify(fresh)));
    showToast(`Template reset to official standard for ${fresh.name}`);
  };

  // Export Template JSON
  const handleExportTemplate = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(template, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${template.id}-cris-template.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Template configuration exported as JSON file.');
  };

  // Import Template JSON
  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.blocks && imported.header && imported.watermark) {
          setTemplate(imported);
          storageService.saveCertificateTemplate(imported, currentUser);
          showToast('Custom template successfully imported and applied!');
        } else {
          showToast('Error: Invalid template file format.');
        }
      } catch (err) {
        showToast('Error: Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Test Print
  const handleTestPrint = () => {
    window.print();
  };

  // Drag and Drop reordering for blocks
  const handleDragStart = (index: number) => {
    setDraggedBlockIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverBlockIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedBlockIndex === null || draggedBlockIndex === index) {
      setDraggedBlockIndex(null);
      setDragOverBlockIndex(null);
      return;
    }
    const newBlocks = [...template.blocks];
    const [movedItem] = newBlocks.splice(draggedBlockIndex, 1);
    newBlocks.splice(index, 0, movedItem);

    // Reassign order
    const updated = newBlocks.map((b, idx) => ({ ...b, order: idx + 1 }));
    setTemplate({ ...template, blocks: updated });
    setDraggedBlockIndex(null);
    setDragOverBlockIndex(null);
  };

  // Move block up or down
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= template.blocks.length) return;
    const newBlocks = [...template.blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;

    const updated = newBlocks.map((b, idx) => ({ ...b, order: idx + 1 }));
    setTemplate({ ...template, blocks: updated });
  };

  // Move block by unique block ID
  const moveBlockById = (blockId: string, direction: 'up' | 'down') => {
    const index = template.blocks.findIndex((b) => b.id === blockId);
    if (index !== -1) {
      moveBlock(index, direction);
    }
  };

  // Canvas block click handler (synchronizes selection & opens respective editor tab)
  const handleCanvasBlockClick = (blockId: string, blockType: string) => {
    if (canvasInteractionMode !== 'interactive') return;
    setSelectedBlockId(blockId);
    if (blockType === 'header') {
      setActiveEditorTab('header');
    } else if (blockType === 'logos') {
      setActiveEditorTab('logos');
    } else if (blockType === 'receipt_footer' || blockType === 'qr_verification') {
      setActiveEditorTab('footer');
    } else {
      setActiveEditorTab('layout');
    }
  };

  // Toggle block visibility
  const toggleBlockVisibility = (blockId: string) => {
    const updated = template.blocks.map((b) =>
      b.id === blockId ? { ...b, enabled: !b.enabled } : b
    );
    setTemplate({ ...template, blocks: updated });
  };

  // Add custom text block with customizable presets
  const handleAddCustomBlock = (preset: 'custom_text' | 'jurat' | 'cosignatory' | 'warning' = 'custom_text') => {
    const newId = `block-custom-${Date.now()}`;
    let title = 'Custom Text / Legal Notation';
    let content = 'This is an official annotation issued pursuant to municipal ordinance. Issued to {{PERSON_NAME}}.';
    let border = false;

    if (preset === 'jurat') {
      title = 'Notarial Acknowledgment / Jurat';
      content = 'SUBSCRIBED AND SWORN to before me this {{DATE_ISSUED}} at the Municipality of {{MUNICIPALITY}}, {{PROVINCE}}, affiant exhibiting competent proof of identity.';
      border = true;
    } else if (preset === 'cosignatory') {
      title = 'Verifier / Staff Co-Signatory';
      content = 'Verified and checked by:\n\n{{VERIFIER_NAME}}\n{{VERIFIER_TITLE}}\nMCR Verification Staff';
      border = false;
    } else if (preset === 'warning') {
      title = 'Anti-Tampering / Security Notice';
      content = 'WARNING: Any erasure, alteration, or mark of tampering renders this official certification null and void. Authenticate using the QR Code verification registry.';
      border = true;
    }

    const newBlock: CertificateLayoutBlock = {
      id: newId,
      type: 'custom_text',
      title,
      enabled: true,
      order: template.blocks.length + 1,
      customContent: content,
      align: 'left',
      fontSize: 'xs',
      fontBold: false,
      paddingTop: 4,
      paddingBottom: 4,
      showBorderBox: border,
    };
    setTemplate({ ...template, blocks: [...template.blocks, newBlock] });
    setSelectedBlockId(newId);
    setInlineEditingBlockId(newId);
    setShowAddBlockMenu(false);
    showToast(`Added "${title}" block to template layout.`);
  };

  // Remove custom block
  const handleRemoveBlock = (blockId: string) => {
    const updated = template.blocks.filter((b) => b.id !== blockId);
    setTemplate({ ...template, blocks: updated.map((b, idx) => ({ ...b, order: idx + 1 })) });
    if (selectedBlockId === blockId) setSelectedBlockId(null);
    showToast('Block removed from layout.');
  };

  // Copy placeholder token to clipboard
  const copyPlaceholder = (token: string) => {
    navigator.clipboard.writeText(token);
    showToast(`Copied ${token} to clipboard!`);
  };

  // Custom Logo Upload Handler
  const handleLogoUpload = (side: 'left' | 'right', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (side === 'left') {
        setTemplate({
          ...template,
          logos: { ...template.logos, showLeftLogo: true, leftLogoType: 'custom', leftLogoUrl: dataUrl },
        });
      } else {
        setTemplate({
          ...template,
          logos: { ...template.logos, showRightLogo: true, rightLogoType: 'custom', rightLogoUrl: dataUrl },
        });
      }
      showToast(`Custom ${side} logo uploaded successfully!`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Sample data dictionary for preview substitution
  const sampleValues: Record<string, string> = {};
  CERTIFICATE_PLACEHOLDERS.forEach((p) => {
    sampleValues[p.token] = p.sampleValue;
  });
  sampleValues['{{MUNICIPALITY}}'] = siteSettings.municipality || 'CULABA';
  sampleValues['{{PROVINCE}}'] = siteSettings.province || 'BILIRAN';
  sampleValues['{{OFFICE_NAME}}'] = siteSettings.officeName || 'OFFICE OF THE MUNICIPAL CIVIL REGISTRAR';
  sampleValues['{{MCR_OFFICER_NAME}}'] = siteSettings.mcrOfficerName || 'FRANCIS JEFF C. PO, MCR';
  sampleValues['{{MCR_OFFICER_TITLE}}'] = siteSettings.mcrOfficerTitle || 'Municipal Civil Registrar';
  const defaultStaff = siteSettings.mcrStaff?.find((s) => s.isDefault) || siteSettings.mcrStaff?.[0];
  sampleValues['{{VERIFIER_NAME}}'] = defaultStaff?.name || siteSettings.assistantMcrName || 'MARIA ELENA SANTOS';
  sampleValues['{{VERIFIER_TITLE}}'] = defaultStaff?.title || siteSettings.assistantMcrTitle || 'Registration Staff / Verifier';
  sampleValues['{{FORM_CODE}}'] = `LCR FORM NO. ${selectedFormType === 'LCR_FORM_1' ? '1' : selectedFormType === 'LCR_FORM_2' ? '2' : '3'}${selectedFormLetter}`;
  sampleValues['{{FORM_TITLE}}'] = `CERTIFICATION OF ${selectedFormType === 'LCR_FORM_1' ? 'BIRTH' : selectedFormType === 'LCR_FORM_2' ? 'DEATH' : 'MARRIAGE'}`;
  sampleValues['{{STATUS_LETTER}}'] = `${selectedFormLetter} (${selectedFormLetter === 'A' ? 'AVAILABLE' : selectedFormLetter === 'B' ? 'NOT AVAILABLE' : 'DESTROYED'})`;
  sampleValues['{{VERIFICATION_CODE}}'] = 'CRIS-CLB-2026-8921-A1';
  sampleValues['{{verification_code}}'] = 'CRIS-CLB-2026-8921-A1';
  sampleValues['{{QR_CODE}}'] = generateQrSvgString(
    `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}?verify=CRIS-CLB-2026-8921-A1`,
    64
  );
  sampleValues['{{qr_code}}'] = sampleValues['{{QR_CODE}}'];

  // Render text based on preview mode
  const formatText = (rawText: string) => {
    if (previewMode === 'raw') return rawText;
    return replacePlaceholders(rawText, sampleValues);
  };

  // Helper logo renderer
  const renderLogoGraphic = (type: string, customUrl?: string, size = 64) => {
    if (type === 'custom' && customUrl) {
      return (
        <img
          src={customUrl}
          alt="Custom Logo"
          className="object-contain"
          style={{ width: `${size}px`, height: `${size}px` }}
        />
      );
    }
    if (type === 'psa') {
      return (
        <div
          className="rounded-full bg-blue-900 border-2 border-amber-400 flex flex-col items-center justify-center text-white shadow-xs p-1"
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <Building2 className="w-1/2 h-1/2 text-amber-300" />
          <span className="text-[7px] font-bold font-sans tracking-tight text-center leading-none mt-0.5">PSA</span>
          <span className="text-[5px] text-amber-200 uppercase leading-none scale-90">CIVIL REG</span>
        </div>
      );
    }
    if (type === 'bagong_pilipinas') {
      return (
        <div
          className="rounded-full bg-red-800 border-2 border-blue-600 flex flex-col items-center justify-center text-white shadow-xs p-1"
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <Shield className="w-1/2 h-1/2 text-yellow-300" />
          <span className="text-[6px] font-bold font-sans tracking-tight text-center leading-none mt-0.5 uppercase">PILIPINAS</span>
        </div>
      );
    }
    // Default Municipal Seal
    return (
      <div
        className="rounded-full bg-emerald-900 border-2 border-yellow-400 flex flex-col items-center justify-center text-white shadow-xs p-1"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <Building2 className="w-1/2 h-1/2 text-yellow-300" />
        <span className="text-[6px] font-bold font-sans tracking-tight text-center leading-none mt-0.5 uppercase">
          {siteSettings.municipality.slice(0, 6)}
        </span>
        <span className="text-[5px] text-emerald-200 uppercase leading-none">SEAL</span>
      </div>
    );
  };

  // Form type labels
  const getEventName = () =>
    selectedFormType === 'LCR_FORM_1' ? 'Birth' : selectedFormType === 'LCR_FORM_2' ? 'Death' : 'Marriage';

  return (
    <div className="space-y-4 font-sans max-w-7xl mx-auto pb-12">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Municipal Form Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">Certificate Designer</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                FORMS 1x, 2x, 3x
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Official Civil Registry Document & Certificate Layout
            </p>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold mr-1">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Certificate Layout</span>
          </div>

          {onBackToCertifications && (
            <button
              type="button"
              onClick={onBackToCertifications}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Back to Certs
            </button>
          )}

          <button
            type="button"
            onClick={handleExportTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Export template as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
            <input
              ref={templateImportRef}
              type="file"
              accept=".json"
              onChange={handleImportTemplate}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            title="Reset this form template to PSA/LCR standard"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Standard</span>
          </button>

          <button
            type="button"
            onClick={handleTestPrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Test Print</span>
          </button>

          <button
            type="button"
            onClick={handleSaveTemplate}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Template</span>
          </button>
        </div>
      </div>

      {/* Municipal Form Type (1x, 2x, 3x) and Letter Code Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        {/* Step 1: Form Category (1x, 2x, 3x) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Select Municipal Form Book:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedFormType('LCR_FORM_1')}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                selectedFormType === 'LCR_FORM_1'
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Baby className="w-4 h-4" />
              <span>Form 1x (Birth)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormType('LCR_FORM_2')}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                selectedFormType === 'LCR_FORM_2'
                  ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Cross className="w-4 h-4" />
              <span>Form 2x (Death)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormType('LCR_FORM_3')}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                selectedFormType === 'LCR_FORM_3'
                  ? 'bg-pink-600 border-pink-600 text-white shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Form 3x (Marriage)</span>
            </button>
          </div>
        </div>

        {/* Step 2: Letter Status (A, B, C) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Select Status Letter (A, B, or C):
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedFormLetter('A')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition text-center cursor-pointer ${
                selectedFormLetter === 'A'
                  ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Letter A</span>
              <span className={`block text-[10px] ${selectedFormLetter === 'A' ? 'text-emerald-100' : 'text-emerald-700 font-bold'}`}>
                Available
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormLetter('B')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition text-center cursor-pointer ${
                selectedFormLetter === 'B'
                  ? 'bg-rose-600 border-rose-600 text-white font-bold shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Letter B</span>
              <span className={`block text-[10px] ${selectedFormLetter === 'B' ? 'text-rose-100' : 'text-rose-700 font-bold'}`}>
                Not Available
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormLetter('C')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition text-center cursor-pointer ${
                selectedFormLetter === 'C'
                  ? 'bg-orange-600 border-orange-600 text-white font-bold shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Letter C</span>
              <span className={`block text-[10px] ${selectedFormLetter === 'C' ? 'text-orange-100' : 'text-orange-700 font-bold'}`}>
                Destroyed / Lost
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* View Switcher: WYSIWYG Freeform Document Builder vs Blocks & Layout Inspector */}
      {designerMode === 'wysiwyg' ? (
        <WysiwygTemplateBuilder
          template={template}
          siteSettings={siteSettings}
          currentUser={currentUser}
          onSave={(updated) => {
            setTemplate(updated);
            storageService.saveCertificateTemplate(updated, currentUser || undefined);
            showToast(`Template for Form ${updated.formType.slice(-1)}${updated.formLetter} saved successfully`);
          }}
          onBack={onBackToCertifications || (() => {})}
        />
      ) : (
        /* Main Designer Grid: Controls (Left) & Canvas Preview (Right) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Control Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Navigation Tabs for Designer Modules */}
          <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveEditorTab('layout')}
              className={`px-3 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                activeEditorTab === 'layout'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Layout Blocks</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveEditorTab('header')}
              className={`px-3 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                activeEditorTab === 'header'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Header</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveEditorTab('logos')}
              className={`px-3 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                activeEditorTab === 'logos'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Logos</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveEditorTab('watermark')}
              className={`px-3 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                activeEditorTab === 'watermark'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Watermark</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveEditorTab('footer')}
              className={`px-3 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                activeEditorTab === 'footer'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Footer</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveEditorTab('placeholders')}
              className={`px-3 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                activeEditorTab === 'placeholders'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Placeholders</span>
            </button>
          </div>

          {/* Tab 1: Layout & Drag and Drop Reordering */}
          {activeEditorTab === 'layout' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between relative">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Drag & Drop Certificate Blocks
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Reorder, hide/show, or customize individual document sections
                  </p>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAddBlockMenu(!showAddBlockMenu)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Block</span>
                    <ChevronDown className="w-3 h-3 ml-0.5" />
                  </button>

                  {showAddBlockMenu && (
                    <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 text-xs">
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Select Block Preset:
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddCustomBlock('custom_text')}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition cursor-pointer flex flex-col"
                      >
                        <span className="font-semibold text-slate-900">Custom Legal Clause</span>
                        <span className="text-[10px] text-slate-500">Freeform text with tokens</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddCustomBlock('jurat')}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition cursor-pointer flex flex-col"
                      >
                        <span className="font-semibold text-slate-900">Notarial Jurat / Acknowledgment</span>
                        <span className="text-[10px] text-slate-500">Subscribed & sworn box with border</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddCustomBlock('cosignatory')}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition cursor-pointer flex flex-col"
                      >
                        <span className="font-semibold text-slate-900">Assistant Civil Registrar Signatory</span>
                        <span className="text-[10px] text-slate-500">Secondary verification officer block</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddCustomBlock('warning')}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition cursor-pointer flex flex-col"
                      >
                        <span className="font-semibold text-slate-900">Anti-Tampering Security Notice</span>
                        <span className="text-[10px] text-slate-500">Fraud prevention clause box</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Draggable Blocks List */}
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {template.blocks.map((block, index) => {
                  const isDragging = draggedBlockIndex === index;
                  const isDragOver = dragOverBlockIndex === index;
                  const isSelected = selectedBlockId === block.id;

                  return (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={() => handleDrop(index)}
                      onClick={() => setSelectedBlockId(block.id)}
                      className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 text-xs select-none ${
                        isDragging ? 'opacity-40 border-blue-500 bg-blue-50' : 'bg-white'
                      } ${isDragOver ? 'border-blue-600 bg-blue-50/50' : ''} ${
                        isSelected ? 'ring-2 ring-blue-500/20 border-blue-500' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <span
                            className={`font-semibold truncate block ${
                              block.enabled ? 'text-slate-800' : 'text-slate-400 line-through'
                            }`}
                          >
                            {block.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            type: {block.type}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Move Up / Down Buttons */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveBlock(index, 'up');
                          }}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded transition cursor-pointer"
                          title="Move block up"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveBlock(index, 'down');
                          }}
                          disabled={index === template.blocks.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded transition cursor-pointer"
                          title="Move block down"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Visibility Toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBlockVisibility(block.id);
                          }}
                          className={`p-1 rounded transition cursor-pointer ${
                            block.enabled
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={block.enabled ? 'Hide from certificate' : 'Show on certificate'}
                        >
                          {block.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        {/* Custom Block Delete */}
                        {block.type === 'custom_text' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveBlock(block.id);
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Delete custom block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Block Inspector if selected */}
              {selectedBlockId && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-600" />
                      <span>Block Inspector & Style</span>
                    </h4>
                    <span className="font-mono text-[10px] text-slate-400 uppercase">
                      ID: {selectedBlockId}
                    </span>
                  </div>
                  {template.blocks.find((b) => b.id === selectedBlockId) && (() => {
                    const currentBlock = template.blocks.find((b) => b.id === selectedBlockId)!;
                    return (
                      <div className="space-y-2.5">
                        {/* Title rename field */}
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-1">Block Display Title</label>
                          <input
                            type="text"
                            value={currentBlock.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTemplate({
                                ...template,
                                blocks: template.blocks.map((b) =>
                                  b.id === selectedBlockId ? { ...b, title: val } : b
                                ),
                              });
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>

                        {/* Alignment & Font Size */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Text Alignment</label>
                            <select
                              value={currentBlock.align || 'left'}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setTemplate({
                                  ...template,
                                  blocks: template.blocks.map((b) =>
                                    b.id === selectedBlockId ? { ...b, align: val } : b
                                  ),
                                });
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                            >
                              <option value="left">Left Aligned</option>
                              <option value="center">Centered</option>
                              <option value="right">Right Aligned</option>
                              <option value="justify">Justified</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Font Size</label>
                            <select
                              value={currentBlock.fontSize || 'sm'}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setTemplate({
                                  ...template,
                                  blocks: template.blocks.map((b) =>
                                    b.id === selectedBlockId ? { ...b, fontSize: val } : b
                                  ),
                                });
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                            >
                              <option value="xs">Small (11px)</option>
                              <option value="sm">Regular (13px)</option>
                              <option value="base">Medium (14px)</option>
                              <option value="lg">Large (16px)</option>
                            </select>
                          </div>
                        </div>

                        {/* Spacing & Border Box */}
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Top Pad (px)</label>
                            <input
                              type="number"
                              min="0"
                              max="32"
                              value={currentBlock.paddingTop ?? 4}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setTemplate({
                                  ...template,
                                  blocks: template.blocks.map((b) =>
                                    b.id === selectedBlockId ? { ...b, paddingTop: val } : b
                                  ),
                                });
                              }}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">Bottom Pad (px)</label>
                            <input
                              type="number"
                              min="0"
                              max="32"
                              value={currentBlock.paddingBottom ?? 4}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setTemplate({
                                  ...template,
                                  blocks: template.blocks.map((b) =>
                                    b.id === selectedBlockId ? { ...b, paddingBottom: val } : b
                                  ),
                                });
                              }}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                            />
                          </div>
                          <div className="pt-3">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={currentBlock.showBorderBox ?? false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setTemplate({
                                    ...template,
                                    blocks: template.blocks.map((b) =>
                                      b.id === selectedBlockId ? { ...b, showBorderBox: checked } : b
                                    ),
                                  });
                                }}
                                className="rounded text-blue-600"
                              />
                              <span className="text-[11px] text-slate-700">Frame Box</span>
                            </label>
                          </div>
                        </div>

                        {/* Custom Text / Notation Content Editor */}
                        {currentBlock.type === 'custom_text' && (
                          <div className="mt-2">
                            <label className="text-[10px] text-slate-500 font-semibold block mb-1">Custom Content & Placeholders</label>
                            <textarea
                              rows={3}
                              value={currentBlock.customContent || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTemplate({
                                  ...template,
                                  blocks: template.blocks.map((b) =>
                                    b.id === selectedBlockId ? { ...b, customContent: val } : b
                                  ),
                                });
                              }}
                              className="w-full p-2 bg-white border border-slate-300 rounded text-xs font-mono"
                              placeholder="Type custom clause, e.g. Certified for {{PERSON_NAME}}..."
                            />
                          </div>
                        )}

                        {/* Salutation Wording Editor */}
                        {currentBlock.type === 'salutation' && (
                          <div className="mt-2">
                            <label className="text-[10px] text-slate-500 font-semibold block mb-1">Salutation Text</label>
                            <input
                              type="text"
                              value={currentBlock.customContent || 'TO WHOM IT MAY CONCERN:'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTemplate({
                                  ...template,
                                  blocks: template.blocks.map((b) =>
                                    b.id === selectedBlockId ? { ...b, customContent: val } : b
                                  ),
                                });
                              }}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                              placeholder="TO WHOM IT MAY CONCERN:"
                            />
                          </div>
                        )}

                        {/* Quick switch tabs for header, logos, footer */}
                        {currentBlock.type === 'header' && (
                          <button
                            type="button"
                            onClick={() => setActiveEditorTab('header')}
                            className="w-full mt-1 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                          >
                            Open Header Settings Tab →
                          </button>
                        )}
                        {currentBlock.type === 'logos' && (
                          <button
                            type="button"
                            onClick={() => setActiveEditorTab('logos')}
                            className="w-full mt-1 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                          >
                            Open Logos Settings Tab →
                          </button>
                        )}
                        {(currentBlock.type === 'receipt_footer' || currentBlock.type === 'qr_verification') && (
                          <button
                            type="button"
                            onClick={() => setActiveEditorTab('footer')}
                            className="w-full mt-1 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                          >
                            Open Footer & Verification Tab →
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Header Customization */}
          {activeEditorTab === 'header' && (
            <div className="p-4 space-y-3 text-xs">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                Official Header Details
              </h3>
              <p className="text-[11px] text-slate-500">
                Customize national, provincial, and municipal government headers
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Country Designation</label>
                <input
                  type="text"
                  value={template.header.countryText}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      header: { ...template.header, countryText: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Province Title</label>
                  <input
                    type="text"
                    value={template.header.provincePrefix}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        header: { ...template.header, provincePrefix: e.target.value },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Municipality Title</label>
                  <input
                    type="text"
                    value={template.header.municipalityPrefix}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        header: { ...template.header, municipalityPrefix: e.target.value },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Office Name</label>
                <input
                  type="text"
                  value={template.header.officeText}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      header: { ...template.header, officeText: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sub-Office / System Tagline</label>
                <input
                  type="text"
                  value={template.header.subText || ''}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      header: { ...template.header, subText: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Divider Style</label>
                  <select
                    value={template.header.dividerStyle}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        header: { ...template.header, dividerStyle: e.target.value as any },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="double">Double Line (Official)</option>
                    <option value="solid">Single Solid Line</option>
                    <option value="dashed">Dashed Line</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Header Alignment</label>
                  <select
                    value={template.header.align}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        header: { ...template.header, align: e.target.value as any },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="center">Centered</option>
                    <option value="left">Left Aligned</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Official Logos & Emblems */}
          {activeEditorTab === 'logos' && (
            <div className="p-4 space-y-4 text-xs">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                Logos & Official Seals
              </h3>
              <p className="text-[11px] text-slate-500">
                Configure Municipal Seal, Philippine Statistics Authority (PSA), or custom LGU insignia
              </p>

              {/* Left Logo */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Left Side Emblem (Municipal Seal)</span>
                  <input
                    type="checkbox"
                    checked={template.logos.showLeftLogo}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        logos: { ...template.logos, showLeftLogo: e.target.checked },
                      })
                    }
                    className="rounded text-blue-600 cursor-pointer"
                  />
                </div>

                {template.logos.showLeftLogo && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate({
                            ...template,
                            logos: { ...template.logos, leftLogoType: 'municipal' },
                          })
                        }
                        className={`p-1.5 rounded border text-[11px] font-semibold text-center cursor-pointer ${
                          template.logos.leftLogoType === 'municipal'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        Municipal Seal
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate({
                            ...template,
                            logos: { ...template.logos, leftLogoType: 'bagong_pilipinas' },
                          })
                        }
                        className={`p-1.5 rounded border text-[11px] font-semibold text-center cursor-pointer ${
                          template.logos.leftLogoType === 'bagong_pilipinas'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        National Crest
                      </button>
                      <label className="p-1.5 rounded border text-[11px] font-semibold text-center cursor-pointer bg-white border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center">
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload('left', e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Logo */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Right Side Emblem (PSA / Civil Registry)</span>
                  <input
                    type="checkbox"
                    checked={template.logos.showRightLogo}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        logos: { ...template.logos, showRightLogo: e.target.checked },
                      })
                    }
                    className="rounded text-blue-600 cursor-pointer"
                  />
                </div>

                {template.logos.showRightLogo && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate({
                            ...template,
                            logos: { ...template.logos, rightLogoType: 'psa' },
                          })
                        }
                        className={`p-1.5 rounded border text-[11px] font-semibold text-center cursor-pointer ${
                          template.logos.rightLogoType === 'psa'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        PSA Seal
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate({
                            ...template,
                            logos: { ...template.logos, rightLogoType: 'municipal' },
                          })
                        }
                        className={`p-1.5 rounded border text-[11px] font-semibold text-center cursor-pointer ${
                          template.logos.rightLogoType === 'municipal'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        Municipal Seal
                      </button>
                      <label className="p-1.5 rounded border text-[11px] font-semibold text-center cursor-pointer bg-white border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center">
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload('right', e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Logo Size */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-700">Logo Size</span>
                  <span className="font-mono text-slate-500">{template.logos.logoSizePx} px</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="96"
                  step="4"
                  value={template.logos.logoSizePx}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      logos: { ...template.logos, logoSizePx: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Tab 4: Watermark & Paper Background */}
          {activeEditorTab === 'watermark' && (
            <div className="p-4 space-y-4 text-xs">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                Watermark & Security Background
              </h3>
              <p className="text-[11px] text-slate-500">
                Official dry seal simulation, diagonal text watermark, and paper security tints
              </p>

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="font-bold text-slate-800 block">Enable Background Watermark</span>
                  <span className="text-[10px] text-slate-500">Faint central seal or security text watermark</span>
                </div>
                <input
                  type="checkbox"
                  checked={template.watermark.enabled}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      watermark: { ...template.watermark, enabled: e.target.checked },
                    })
                  }
                  className="rounded text-blue-600 cursor-pointer"
                />
              </div>

              {template.watermark.enabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Watermark Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate({
                            ...template,
                            watermark: { ...template.watermark, type: 'seal' },
                          })
                        }
                        className={`p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                          template.watermark.type === 'seal'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        Official Dry Seal
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate({
                            ...template,
                            watermark: { ...template.watermark, type: 'text' },
                          })
                        }
                        className={`p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                          template.watermark.type === 'text'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        Custom Text Diagonal
                      </button>
                    </div>
                  </div>

                  {template.watermark.type === 'text' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Watermark Text</label>
                      <input
                        type="text"
                        value={template.watermark.text}
                        onChange={(e) =>
                          setTemplate({
                            ...template,
                            watermark: { ...template.watermark, text: e.target.value.toUpperCase() },
                          })
                        }
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                        placeholder="OFFICIAL RECORD"
                      />
                    </div>
                  )}

                  {/* Opacity Slider */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-700">Watermark Opacity</span>
                      <span className="font-mono text-slate-500">{template.watermark.opacityPercent} %</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="20"
                      step="1"
                      value={template.watermark.opacityPercent}
                      onChange={(e) =>
                        setTemplate({
                          ...template,
                          watermark: { ...template.watermark, opacityPercent: Number(e.target.value) },
                        })
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Rotation Angle */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-700">Rotation Angle</span>
                      <span className="font-mono text-slate-500">{template.watermark.rotationDegrees} °</span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      step="5"
                      value={template.watermark.rotationDegrees}
                      onChange={(e) =>
                        setTemplate({
                          ...template,
                          watermark: { ...template.watermark, rotationDegrees: Number(e.target.value) },
                        })
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Paper Background Tint */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Paper Background Tint</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate({
                            ...template,
                            watermark: { ...template.watermark, paperTint: 'white' },
                          })
                        }
                        className={`p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                          template.watermark.paperTint === 'white'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        Crisp White
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate({
                            ...template,
                            watermark: { ...template.watermark, paperTint: 'cream' },
                          })
                        }
                        className={`p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                          template.watermark.paperTint === 'cream'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        Archival Ivory
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Footer & Legal Verification */}
          {activeEditorTab === 'footer' && (
            <div className="p-4 space-y-3 text-xs">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                Official Footer & Legal Citations
              </h3>
              <p className="text-[11px] text-slate-500">
                Official receipt details, Republic Act legal annotations, and seal validation notices
              </p>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-semibold text-slate-700">Display Treasury O.R. & Fee Bar</span>
                <input
                  type="checkbox"
                  checked={template.footer.showReceiptBar}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      footer: { ...template.footer, showReceiptBar: e.target.checked },
                    })
                  }
                  className="rounded text-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Official Seal Notice</label>
                <input
                  type="text"
                  value={template.footer.sealNoticeText}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      footer: { ...template.footer, sealNoticeText: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Civil Registry Law Citation</label>
                <input
                  type="text"
                  value={template.footer.legalCitationText}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      footer: { ...template.footer, legalCitationText: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Custom Security Note</label>
                <textarea
                  rows={2}
                  value={template.footer.customFooterNote || ''}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      footer: { ...template.footer, customFooterNote: e.target.value },
                    })
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {/* Tab 6: Dynamic Data Placeholders Palette */}
          {activeEditorTab === 'placeholders' && (
            <div className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                    Dynamic Data Tokens
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Click any token to copy and insert into remarks, custom blocks, or headers
                  </p>
                </div>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {['Form 1A Particulars', 'Subject', 'Registry Particulars', 'Office & Municipality', 'Transaction & Fees'].map(
                  (cat) => (
                    <div key={cat} className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {cat}
                      </span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {CERTIFICATE_PLACEHOLDERS.filter((p) => p.category === cat).map((item) => (
                          <div
                            key={item.token}
                            onClick={() => copyPlaceholder(item.token)}
                            className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition cursor-pointer flex items-center justify-between group"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-blue-700 text-xs">
                                  {item.token}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-700">
                                  ({item.label})
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 block truncate">
                                Sample: {item.sampleValue}
                              </span>
                            </div>
                            <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Live Certificate Canvas Preview (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Canvas Toolbar */}
          <div className="w-full max-w-[720px] mb-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Interaction Mode Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">Mode:</span>
              <button
                type="button"
                onClick={() => setCanvasInteractionMode('interactive')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  canvasInteractionMode === 'interactive'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Click sections directly on paper to inspect and edit"
              >
                <MousePointerClick className="w-3.5 h-3.5" />
                <span>Click-to-Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setCanvasInteractionMode('preview')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  canvasInteractionMode === 'preview'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="View clean official paper without editor outlines"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Clean Paper</span>
              </button>
            </div>

            {/* Data Mode Toggle */}
            <div className="flex items-center gap-1.5 sm:border-l sm:border-slate-200 sm:pl-3">
              <span className="font-medium text-slate-600">Data:</span>
              <button
                type="button"
                onClick={() => setPreviewMode('sample')}
                className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                  previewMode === 'sample'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sample
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('raw')}
                className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                  previewMode === 'raw'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tokens
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              Philippine Official Paper (8.5 × 13 in / Folio)
            </span>
          </div>

          {/* Interactive Mode Hint */}
          {canvasInteractionMode === 'interactive' && (
            <div className="w-full max-w-[816px] mb-2 px-3 py-1 bg-blue-50/70 border border-blue-200/80 rounded-lg text-[11px] text-blue-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <MousePointerClick className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                <span>Interactive mode: Click any block below to select & reorder. Double-click text blocks to edit inline.</span>
              </span>
              <span className="text-[10px] font-mono text-blue-600">
                Selected: {template.blocks.find((b) => b.id === selectedBlockId)?.title || 'None'}
              </span>
            </div>
          )}

          {/* Certificate Paper Sheet */}
          <div
            ref={printRef}
            id="printable-lcr-certificate-designer"
            className={`w-full max-w-[816px] rounded-sm p-8 sm:p-12 shadow-xl border border-slate-300 relative font-serif text-slate-950 transition ${
              template.watermark.paperTint === 'cream'
                ? 'bg-[#FDFCF7]'
                : 'bg-white'
            }`}
            style={{ minHeight: '1248px' }}
          >
            {/* Watermark Overlay */}
            {template.watermark.enabled && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
                style={{
                  opacity: template.watermark.opacityPercent / 100,
                  transform: `rotate(${template.watermark.rotationDegrees}deg)`,
                }}
              >
                {template.watermark.type === 'seal' ? (
                  <Building2
                    className="text-slate-900"
                    style={{ width: `${template.watermark.sizePx}px`, height: `${template.watermark.sizePx}px` }}
                  />
                ) : (
                  <span
                    className="font-black font-sans uppercase tracking-widest text-slate-900 whitespace-nowrap text-center"
                    style={{ fontSize: '42px' }}
                  >
                    {template.watermark.text || 'OFFICIAL RECORD'}
                  </span>
                )}
              </div>
            )}

            {/* Dynamic Layout Blocks Rendering in Configured Order */}
            <div className="relative z-10 space-y-3">
              {template.blocks
                .filter((b) => b.enabled)
                .sort((a, b) => a.order - b.order)
                .map((block) => {
                  const isSelected = selectedBlockId === block.id;
                  const isInteractive = canvasInteractionMode === 'interactive';
                  const blockIndex = template.blocks.findIndex((b) => b.id === block.id);

                  const wrapInteractive = (children: React.ReactNode) => (
                    <div
                      key={block.id}
                      onClick={(e) => {
                        if (!isInteractive) return;
                        e.stopPropagation();
                        handleCanvasBlockClick(block.id, block.type);
                      }}
                      className={`relative group transition-all duration-150 ${
                        isInteractive
                          ? isSelected
                            ? 'ring-2 ring-blue-500 bg-blue-50/15 rounded-md p-1.5 shadow-xs'
                            : 'hover:ring-1.5 hover:ring-blue-400/60 hover:bg-slate-50/60 cursor-pointer rounded-sm p-1'
                          : ''
                      }`}
                    >
                      {/* Floating Toolbar on canvas when selected in interactive mode */}
                      {isInteractive && isSelected && (
                        <div
                          className="absolute -top-7 right-0 z-30 flex items-center gap-1 bg-slate-900 text-white px-2 py-0.5 rounded-t-md shadow-md text-[10px] font-sans font-semibold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-blue-300 mr-1 flex items-center gap-1 font-bold">
                            <Sliders className="w-3 h-3" />
                            {block.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => moveBlockById(block.id, 'up')}
                            disabled={blockIndex <= 0}
                            className="p-0.5 hover:text-blue-300 disabled:opacity-30 transition cursor-pointer"
                            title="Move block up"
                          >
                            <MoveUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBlockById(block.id, 'down')}
                            disabled={blockIndex >= template.blocks.length - 1}
                            className="p-0.5 hover:text-blue-300 disabled:opacity-30 transition cursor-pointer"
                            title="Move block down"
                          >
                            <MoveDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleBlockVisibility(block.id)}
                            className="p-0.5 hover:text-amber-300 transition cursor-pointer"
                            title="Hide block"
                          >
                            <EyeOff className="w-3 h-3" />
                          </button>
                          {block.type === 'custom_text' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBlock(block.id)}
                              className="p-0.5 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                              title="Delete custom block"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                      {children}
                    </div>
                  );

                  switch (block.type) {
                    case 'logos':
                      return wrapInteractive(
                        <div
                          className="flex items-center justify-between pb-1"
                          style={{
                            paddingTop: `${block.paddingTop || 0}px`,
                            paddingBottom: `${block.paddingBottom || 4}px`,
                          }}
                        >
                          <div>
                            {template.logos.showLeftLogo &&
                              renderLogoGraphic(template.logos.leftLogoType, template.logos.leftLogoUrl, template.logos.logoSizePx)}
                          </div>
                          <div>
                            {template.logos.showRightLogo &&
                              renderLogoGraphic(template.logos.rightLogoType, template.logos.rightLogoUrl, template.logos.logoSizePx)}
                          </div>
                        </div>
                      );

                    case 'header':
                      return wrapInteractive(
                        <div
                          className={`space-y-0.5 pb-3 ${
                            template.header.align === 'left' ? 'text-left' : 'text-center'
                          } ${
                            template.header.showDivider
                              ? template.header.dividerStyle === 'double'
                                ? 'border-b-4 border-double border-slate-900'
                                : template.header.dividerStyle === 'dashed'
                                ? 'border-b border-dashed border-slate-900'
                                : 'border-b-2 border-slate-900'
                              : ''
                          }`}
                          style={{
                            paddingTop: `${block.paddingTop || 0}px`,
                            paddingBottom: `${block.paddingBottom || 8}px`,
                          }}
                        >
                          <p className="text-[11px] font-sans tracking-widest text-slate-700 uppercase">
                            {formatText(template.header.countryText)}
                          </p>
                          <p className="text-[11px] font-sans font-semibold tracking-wider text-slate-800 uppercase">
                            {formatText(template.header.provincePrefix)}
                          </p>
                          <p className="text-[11px] font-sans font-bold tracking-wider text-slate-900 uppercase">
                            {formatText(template.header.municipalityPrefix)}
                          </p>
                          <h1 className="text-xs sm:text-sm font-sans font-black tracking-wide text-slate-950 uppercase pt-0.5">
                            {formatText(template.header.officeText)}
                          </h1>
                          {template.header.subText && (
                            <p className="text-[10px] font-sans text-slate-600">
                              {formatText(template.header.subText)}
                            </p>
                          )}
                        </div>
                      );

                    case 'doc_meta':
                      return wrapInteractive(
                        <div className="flex items-center justify-between text-xs font-sans pt-2 pb-1">
                          <div>
                            <span className="font-bold text-slate-900 text-xs border-b border-slate-900 pb-0.5 font-mono">
                              {formatText('{{FORM_CODE}}')}
                            </span>
                            <span className="block text-[10px] text-slate-500 mt-0.5 font-mono">
                              Series of {new Date().getFullYear()}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-700 block text-[11px]">
                              Date: <strong>{formatText('{{DATE_ISSUED}}')}</strong>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              O.R. No. {formatText('{{OR_NUMBER}}')}
                            </span>
                          </div>
                        </div>
                      );

                    case 'doc_title':
                      return wrapInteractive(
                        <div
                          className={`my-3 ${
                            block.align === 'left' ? 'text-left' : block.align === 'right' ? 'text-right' : 'text-center'
                          }`}
                        >
                          <h2 className="text-sm sm:text-base font-black tracking-wider uppercase underline underline-offset-4 text-slate-950 font-sans">
                            {formatText('{{FORM_TITLE}}')}
                          </h2>
                          <span className="block text-[10px] text-slate-600 font-sans font-bold uppercase mt-1">
                            STATUS: {formatText('{{STATUS_LETTER}}')}
                          </span>
                        </div>
                      );

                    case 'salutation':
                      const isEditingSalutation = inlineEditingBlockId === block.id && isInteractive;
                      return wrapInteractive(
                        <div>
                          {isEditingSalutation ? (
                            <div
                              className="flex items-center gap-2 p-1.5 bg-blue-50 border border-blue-300 rounded font-sans"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                value={block.customContent || 'TO WHOM IT MAY CONCERN:'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTemplate({
                                    ...template,
                                    blocks: template.blocks.map((b) => (b.id === block.id ? { ...b, customContent: val } : b)),
                                  });
                                }}
                                className="px-2 py-1 bg-white border border-blue-400 rounded text-xs font-bold flex-1"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => setInlineEditingBlockId(null)}
                                className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-bold cursor-pointer"
                              >
                                Done ✓
                              </button>
                            </div>
                          ) : (
                            <div
                              onDoubleClick={() => setInlineEditingBlockId(block.id)}
                              className="pt-2 font-bold font-sans tracking-wide text-xs flex items-center justify-between"
                            >
                              <span>{formatText(block.customContent || 'TO WHOM IT MAY CONCERN:')}</span>
                              {isSelected && isInteractive && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineEditingBlockId(block.id);
                                  }}
                                  className="text-[10px] text-blue-600 hover:underline font-normal inline-flex items-center gap-0.5 cursor-pointer font-sans"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit Text
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );

                    case 'certification_body':
                      return wrapInteractive(
                        <div className="text-xs sm:text-sm leading-relaxed text-slate-900">
                          {selectedFormLetter === 'A' && (
                            <p className="indent-8 text-justify">
                              This is to certify that according to the Civil Registry Records archived in this office, the{' '}
                              <strong>{getEventName()}</strong> record of{' '}
                              <span className="font-bold uppercase underline font-sans">
                                {formatText('{{PERSON_NAME}}')}
                              </span>{' '}
                              is <strong>AVAILABLE</strong> and duly recorded under the following verified particulars:
                            </p>
                          )}
                          {selectedFormLetter === 'B' && (
                            <p className="indent-8 text-justify">
                              This is to certify that after a careful, diligent, and exhaustive search conducted in the records
                              and archival books of this office, the record of <strong>{getEventName()}</strong> of{' '}
                              <span className="font-bold uppercase underline font-sans">
                                {formatText('{{PERSON_NAME}}')}
                              </span>
                              , reportedly occurring on <strong>{formatText('{{EVENT_DATE}}')}</strong> at{' '}
                              <strong>{formatText('{{EVENT_PLACE}}')}</strong>, does{' '}
                              <strong>NOT APPEAR OR CANNOT BE FOUND</strong> in the Civil Registry Books of this municipality.
                            </p>
                          )}
                          {selectedFormLetter === 'C' && (
                            <p className="indent-8 text-justify">
                              This is to certify that the official Civil Registry Books of <strong>{getEventName()}</strong>{' '}
                              covering the pertaining period, including the entry of{' '}
                              <span className="font-bold uppercase underline font-sans">
                                {formatText('{{PERSON_NAME}}')}
                              </span>
                              , were <strong>DESTROYED / LOST / UNAVAILABLE</strong> in this office due to force majeure, fire,
                              flood, or ravages of war.
                            </p>
                          )}
                        </div>
                      );

                    case 'particulars_table':
                      if (selectedFormLetter !== 'A') return null;
                      const isForm1A = selectedFormType === 'LCR_FORM_1';
                      return wrapInteractive(
                        isForm1A ? (
                          <div className="my-3 border border-slate-900 font-sans text-xs bg-white">
                            <div className="grid grid-cols-2 border-b border-slate-900 p-1.5 bg-slate-50">
                              <span className="font-bold text-slate-800">REGISTRY NO:</span>
                              <span className="font-bold font-mono text-slate-900">{formatText('{{REGISTRY_NO}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-1.5">
                              <span className="font-bold text-slate-800">DATE OF REGISTRATION:</span>
                              <span className="font-bold text-slate-900">{formatText('{{DATE_OF_REGISTRATION}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-1.5 bg-slate-50">
                              <span className="font-bold text-slate-800">NAME OF CHILD:</span>
                              <span className="font-bold uppercase text-slate-900">{formatText('{{NAME_OF_CHILD}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-1.5">
                              <span className="font-bold text-slate-800">SEX:</span>
                              <span className="font-bold text-slate-900">{formatText('{{SEX}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-1.5 bg-slate-50">
                              <span className="font-bold text-slate-800">DATE OF BIRTH:</span>
                              <span className="font-bold text-slate-900">{formatText('{{DATE_OF_BIRTH}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-1.5">
                              <span className="font-bold text-slate-800">PLACE OF BIRTH:</span>
                              <span className="font-bold text-slate-900">{formatText('{{PLACE_OF_BIRTH}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-1.5 bg-slate-50">
                              <span className="font-bold text-slate-800">NAME OF MOTHER:</span>
                              <span className="font-bold uppercase text-slate-900">{formatText('{{NAME_OF_MOTHER}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-1.5">
                              <span className="font-bold text-slate-800">CITIZENSHIP OF THE MOTHER:</span>
                              <span className="font-bold text-slate-900">{formatText('{{CITIZENSHIP_OF_MOTHER}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-1.5 bg-slate-50">
                              <span className="font-bold text-slate-800">NAME OF THE FATHER:</span>
                              <span className="font-bold uppercase text-slate-900">{formatText('{{NAME_OF_FATHER}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-1.5">
                              <span className="font-bold text-slate-800">CITIZENSHIP OF THE FATHER:</span>
                              <span className="font-bold text-slate-900">{formatText('{{CITIZENSHIP_OF_FATHER}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-1.5 bg-slate-50">
                              <span className="font-bold text-slate-800">DATE OF MARRIAGE:</span>
                              <span className="font-bold text-slate-900">{formatText('{{DATE_OF_MARRIAGE}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-1.5">
                              <span className="font-bold text-slate-800">PLACE OF MARRIAGE:</span>
                              <span className="font-bold text-slate-900">{formatText('{{PLACE_OF_MARRIAGE}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 p-1.5 bg-slate-50">
                              <span className="font-bold text-slate-800">REMARKS:</span>
                              <span className="font-bold text-slate-900">{formatText('{{REMARKS}}')}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="my-3 border border-slate-900 font-sans text-xs bg-white">
                            <div className="grid grid-cols-2 border-b border-slate-900 p-2 bg-slate-50">
                              <span className="font-semibold text-slate-700">Registry Number:</span>
                              <span className="font-bold font-mono text-slate-900">{formatText('{{REGISTRY_NUMBER}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-2">
                              <span className="font-semibold text-slate-700">Book Number:</span>
                              <span className="font-bold font-mono text-slate-900">{formatText('{{BOOK_NUMBER}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-2 bg-slate-50">
                              <span className="font-semibold text-slate-700">Page Number:</span>
                              <span className="font-bold font-mono text-slate-900">{formatText('{{PAGE_NUMBER}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-2">
                              <span className="font-semibold text-slate-700">Date of Registration:</span>
                              <span className="font-bold text-slate-900">{formatText('{{REGISTRY_DATE}}')}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-900 p-2 bg-slate-50">
                              <span className="font-semibold text-slate-700">Date & Place of Event:</span>
                              <span className="font-bold text-slate-900">
                                {formatText('{{EVENT_DATE}}')} at {formatText('{{EVENT_PLACE}}')}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 p-2">
                              <span className="font-semibold text-slate-700">Parents / Spouse:</span>
                              <span className="font-bold text-slate-900">{formatText('{{SPOUSE_PARENT_NAME}}')}</span>
                            </div>
                          </div>
                        )
                      );

                    case 'remarks_annotation':
                      return wrapInteractive(
                        <div className="p-2.5 bg-slate-50/90 border-l-2 border-slate-900 text-xs font-sans italic my-2">
                          <strong>Remarks / Legal Annotation:</strong> {formatText('{{REMARKS_TEXT}}')}
                        </div>
                      );

                    case 'purpose_clause':
                      return wrapInteractive(
                        <div className="text-xs sm:text-sm text-slate-900 pt-1">
                          <p className="indent-8 text-justify leading-relaxed">
                            This certification is issued upon the request of{' '}
                            <strong>{formatText('{{REQUESTED_BY}}')}</strong> for{' '}
                            <strong>{formatText('{{PURPOSE}}')}</strong>.
                          </p>
                        </div>
                      );

                    case 'custom_text':
                      const isEditingCustomText = inlineEditingBlockId === block.id && isInteractive;
                      return wrapInteractive(
                        <div>
                          {isEditingCustomText ? (
                            <div
                              className="space-y-1.5 p-2 bg-blue-50 border border-blue-300 rounded font-sans"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-blue-900">Direct Edit Custom Content:</span>
                                <button
                                  type="button"
                                  onClick={() => setInlineEditingBlockId(null)}
                                  className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-bold cursor-pointer"
                                >
                                  Done ✓
                                </button>
                              </div>
                              <textarea
                                rows={3}
                                value={block.customContent || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTemplate({
                                    ...template,
                                    blocks: template.blocks.map((b) => (b.id === block.id ? { ...b, customContent: val } : b)),
                                  });
                                }}
                                className="w-full p-2 bg-white border border-blue-400 rounded text-xs font-mono"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div
                              onDoubleClick={() => setInlineEditingBlockId(block.id)}
                              className={`text-xs my-1 leading-relaxed ${
                                block.showBorderBox ? 'p-2.5 border border-slate-300 rounded bg-slate-50' : ''
                              } ${
                                block.align === 'center'
                                  ? 'text-center'
                                  : block.align === 'right'
                                  ? 'text-right'
                                  : block.align === 'justify'
                                  ? 'text-justify'
                                  : 'text-left'
                              }`}
                            >
                              <p className="whitespace-pre-line">{formatText(block.customContent || '')}</p>
                              {isSelected && isInteractive && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineEditingBlockId(block.id);
                                  }}
                                  className="mt-1 text-[10px] text-blue-600 hover:underline font-normal inline-flex items-center gap-0.5 cursor-pointer font-sans"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit Clause Text
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );

                    case 'signatory':
                      return wrapInteractive(
                        <div className="pt-8 flex justify-between items-start font-sans gap-6">
                          {/* Left: Specimen-Accurate VERIFIED BY + Payment Details + Note */}
                          <div className="text-left font-sans text-xs min-w-[260px] space-y-2">
                            <div className="font-bold text-slate-900 text-xs">
                              VERIFIED BY:
                            </div>
                            <div className="text-center w-56 my-2">
                              <div className="font-bold text-xs uppercase text-slate-950 font-sans">
                                {formatText('{{VERIFIER_NAME}}')}
                              </div>
                              <div className="text-[11px] text-slate-800 font-medium">
                                {formatText('{{VERIFIER_TITLE}}')}
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-900 space-y-0.5 pt-1">
                              <div>Amount Paid :  ₱ {formatText('{{AMOUNT_PAID}}')}</div>
                              <div>O.R. Number : {formatText('{{OR_NUMBER}}')}</div>
                              <div>Date Paid   : {formatText('{{DATE_PAID}}')}</div>
                            </div>
                            <div className="pt-1.5 text-[10px] text-slate-800 italic">
                              Note: A mark, erasure or alteration of any entry invalidates this certification.
                            </div>
                          </div>

                          {/* Right: MCR Official Signatory */}
                          <div className="text-center min-w-[220px] pt-6">
                            <div className="border-b border-slate-900 pb-1 mb-1 font-bold text-xs uppercase text-slate-950 font-sans">
                              {formatText('{{MCR_OFFICER_NAME}}')}
                            </div>
                            <div className="text-[11px] text-slate-800 font-medium">
                              {formatText('{{MCR_OFFICER_TITLE}}')}
                            </div>
                          </div>
                        </div>
                      );

                    case 'qr_verification': {
                      const verificationCode = formatText('{{VERIFICATION_CODE}}') || 'CRIS-CLB-2026-8921-A1';
                      const verificationUrl = `${window.location.origin}${window.location.pathname}?verify=${encodeURIComponent(
                        verificationCode
                      )}`;
                      return wrapInteractive(
                        <div className="pt-4 flex items-center justify-between font-sans border-t border-slate-200 mt-6">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 border border-slate-300 p-1 bg-white rounded flex items-center justify-center shrink-0 shadow-2xs">
                              <QrCodeSvg value={verificationUrl} size={56} />
                            </div>
                            <div className="text-left space-y-0.5">
                              <span className="text-[9px] text-slate-700 font-mono font-bold block">
                                CRIS VERIFICATION CODE: {verificationCode}
                              </span>
                              <span className="text-[8px] text-slate-500 font-mono block">
                                {template.footer.legalCitationText}
                              </span>
                              <div className="flex items-center gap-2 pt-0.5">
                                <span className="text-[8px] text-emerald-800 font-semibold block">
                                  ✓ Scan QR code with camera to verify in Portal
                                </span>
                                <a
                                  href={verificationUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[8px] text-blue-600 hover:text-blue-800 hover:underline font-bold"
                                  title="Test this verification code in portal"
                                >
                                  [Test Verify]
                                </a>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[8px] text-slate-400 uppercase tracking-widest block">
                              OFFICIAL RECORD
                            </span>
                            <span className="text-[9px] font-mono font-bold text-slate-800">
                              PAGE 1 OF 1
                            </span>
                          </div>
                        </div>
                      );
                    }

                    case 'receipt_footer':
                      if (!template.footer.showReceiptBar) return null;
                      return wrapInteractive(
                        <div className="mt-4 pt-2 border-t-2 border-slate-900 text-[10px] font-mono text-slate-700 flex flex-wrap items-center justify-between gap-2">
                          <span>Amount Paid: ₱ {formatText('{{AMOUNT_PAID}}')}</span>
                          <span>O.R. Number: {formatText('{{OR_NUMBER}}')}</span>
                          <span>Date Issued: {formatText('{{DATE_ISSUED}}')}</span>
                          <span className="text-[9px] font-sans font-bold text-slate-900 block w-full text-center mt-1 uppercase">
                            {template.footer.sealNoticeText}
                          </span>
                        </div>
                      );

                    default:
                      return null;
                  }
                })}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

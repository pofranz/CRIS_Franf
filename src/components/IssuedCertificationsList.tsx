import React, { useState, useMemo } from 'react';
import { IssuedCertification, UserAccount, SiteSettings } from '../types';
import { storageService } from '../services/storage';
import { executeCertificatePrint } from '../services/printService';
import { generateQrSvgString } from '../services/qrGenerator';
import { replacePlaceholders } from '../services/templates';
import { formatDateDDMMMYYYY } from '../utils/dateUtils';
import { QrCodeSvg } from './PublicVerificationView';
import {
  Award,
  Search,
  Printer,
  FileText,
  Calendar,
  DollarSign,
  QrCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  PlusCircle,
  Building2,
  X,
  Trash2,
  Sliders,
  Receipt,
} from 'lucide-react';

interface IssuedCertificationsListProps {
  certifications: IssuedCertification[];
  currentUser: UserAccount;
  siteSettings: SiteSettings;
  onOpenNewCert: () => void;
  onOpenDesigner?: () => void;
  onDeleteCertification?: (cert: IssuedCertification) => void;
  onBulkDeleteCertifications?: (ids: string[]) => void;
  onClearAllCertifications?: () => void;
}

export const IssuedCertificationsList: React.FC<IssuedCertificationsListProps> = ({
  certifications,
  currentUser,
  siteSettings,
  onOpenNewCert,
  onOpenDesigner,
  onDeleteCertification,
  onBulkDeleteCertifications,
  onClearAllCertifications,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LCR_FORM_1' | 'LCR_FORM_2' | 'LCR_FORM_3'>('ALL');
  const [letterFilter, setLetterFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [viewingCert, setViewingCert] = useState<IssuedCertification | null>(null);
  const [includeQrCode, setIncludeQrCode] = useState(true);

  // Superadmin deletion & cleanup state
  const isSuperadmin = currentUser.role === 'superadmin';
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [certToDelete, setCertToDelete] = useState<IssuedCertification | null>(null);
  const [bulkDeleteTargetIds, setBulkDeleteTargetIds] = useState<string[] | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const certsRevenue = useMemo(() => {
    return storageService.getRevenueSummary();
  }, [certifications]);

  const filteredCerts = useMemo(() => {
    return certifications.filter((c) => {
      if (typeFilter !== 'ALL' && c.formType !== typeFilter) return false;
      if (letterFilter !== 'ALL' && c.formLetter !== letterFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        c.personName.toLowerCase().includes(q) ||
        (Boolean(c.registryNumber) && c.registryNumber!.toLowerCase().includes(q)) ||
        c.certNumber.toLowerCase().includes(q) ||
        c.orNumber.toLowerCase().includes(q) ||
        c.requestedBy.toLowerCase().includes(q) ||
        c.purpose.toLowerCase().includes(q) ||
        c.verificationCode.toLowerCase().includes(q)
      );
    });
  }, [certifications, typeFilter, letterFilter, searchQuery]);

  const matchingTemplate = useMemo(() => {
    if (!viewingCert) return null;
    return storageService.getCertificateTemplate(viewingCert.formType, viewingCert.formLetter);
  }, [viewingCert]);

  const processedWysiwygHtml = useMemo(() => {
    if (!viewingCert) return '';

    let html = '';
    const hasSnapshot = Boolean(viewingCert.renderedHtml);

    if (hasSnapshot) {
      html = viewingCert.renderedHtml!;
    } else if (matchingTemplate?.freeformHtml && matchingTemplate.editorMode === 'wysiwyg') {
      html = matchingTemplate.freeformHtml;
    } else {
      return '';
    }

    let processed = html;

    if (!hasSnapshot) {

    html = html.replace(/\s*contenteditable=(?:"false"|'false'|false)/gi, '');
    html = html.replace(/data-token="\{\{(?:QR_CODE|qr_code)\}\}"/gi, 'data-qr="true"');
    html = html.replace(/data-token="<svg[\s\S]*?<\/svg>"/gi, 'data-qr="true"');
    html = html.replace(/&quot;\s*contenteditable=&quot;false&quot;&gt;/gi, '');

    html = html.replace(
      /<div style="margin-top:\s*14px;\s*display:\s*flex;\s*flex-direction:\s*column;\s*align-items:\s*center;\s*justify-content:\s*center;">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi,
      '</div></div>'
    );

    const signatoryMatches = html.match(/<!--\s*Signatories[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi);
    if (signatoryMatches && signatoryMatches.length > 1) {
      let count = 0;
      html = html.replace(/<!--\s*Signatories[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, (match) => {
        count++;
        return count === 1 ? match : '';
      });
    }

    html = html.replace(/<div[^>]*font-size:\s*(?:8|9|10)px[^>]*>\s*Municipality of [^<]+<\/div>/gi, '');
    html = html.replace(/<div[^>]*>\s*Municipality of \{\{MUNICIPALITY\}\}\s*<\/div>/gi, '');

    // Dynamically replace any QR code SVG with the live QR code SVG encoding viewingCert.certNumber
    html = html.replace(
      /<svg[^>]*shape-rendering="crispEdges"[^>]*>[\s\S]*?<\/svg>/gi,
      generateQrSvgString(viewingCert.certNumber, 64)
    );

    html = html.replace(/CRIS-[A-Z0-9]+-\d{4}-[A-Z0-9-]+/gi, viewingCert.certNumber);
    html = html.replace(/CRIS-CERT-\d{4}-\d+/gi, viewingCert.certNumber);
    html = html.replace(/CERT-2026-8921/g, viewingCert.certNumber);
    html = html.replace(/CRIS-CLB-2026-8921-A1/g, viewingCert.certNumber);
    html = html.replace(/CRIS VERIFICATION CODE:\s*[A-Z0-9_-]*/gi, `CERTIFICATE NO: ${viewingCert.certNumber}`);

    const mother = viewingCert.motherName ||
      (viewingCert.spouseOrParentName && viewingCert.spouseOrParentName.includes(' / ')
        ? viewingCert.spouseOrParentName.split(' / ')[1]
        : viewingCert.spouseOrParentName || 'N/A');
    const father = viewingCert.fatherName ||
      (viewingCert.spouseOrParentName && viewingCert.spouseOrParentName.includes(' / ')
        ? viewingCert.spouseOrParentName.split(' / ')[0]
        : viewingCert.spouseOrParentName || 'N/A');

    const tokens: Record<string, string> = {
      '{{OFFICE_NAME}}': siteSettings.officeName,
      '{{MUNICIPALITY}}': siteSettings.municipality,
      '{{PROVINCE}}': siteSettings.province,
      '{{REGISTRY_NO}}': viewingCert.registryNumber || 'N/A',
      '{{REGISTRY_NUMBER}}': viewingCert.registryNumber || 'N/A',
      '{{DATE_OF_REGISTRATION}}': formatDateDDMMMYYYY(viewingCert.registryDate || viewingCert.eventDate || viewingCert.dateIssued),
      '{{REGISTRY_DATE}}': formatDateDDMMMYYYY(viewingCert.registryDate || viewingCert.eventDate || viewingCert.dateIssued),
      '{{BOOK_NUMBER}}': viewingCert.bookNumber || 'N/A',
      '{{PAGE_NUMBER}}': viewingCert.pageNumber || 'N/A',
      '{{CHILD_NAME}}': viewingCert.personName,
      '{{NAME_OF_CHILD}}': viewingCert.personName,
      '{{PERSON_NAME}}': viewingCert.personName,
      '{{SEX}}': viewingCert.sex || 'N/A',
      '{{DATE_OF_BIRTH}}': formatDateDDMMMYYYY(viewingCert.eventDate),
      '{{EVENT_DATE}}': formatDateDDMMMYYYY(viewingCert.eventDate),
      '{{PLACE_OF_BIRTH}}': viewingCert.eventPlace || 'N/A',
      '{{EVENT_PLACE}}': viewingCert.eventPlace || 'N/A',
      '{{NAME_OF_MOTHER}}': mother,
      '{{MOTHER_NAME}}': mother,
      '{{CITIZENSHIP_OF_MOTHER}}': viewingCert.motherCitizenship || 'FILIPINO',
      '{{CITIZENSHIP_OF_THE_MOTHER}}': viewingCert.motherCitizenship || 'FILIPINO',
      '{{MOTHER_CITIZENSHIP}}': viewingCert.motherCitizenship || 'FILIPINO',
      '{{NAME_OF_FATHER}}': father,
      '{{NAME_OF_THE_FATHER}}': father,
      '{{FATHER_NAME}}': father,
      '{{CITIZENSHIP_OF_FATHER}}': viewingCert.fatherCitizenship || 'FILIPINO',
      '{{CITIZENSHIP_OF_THE_FATHER}}': viewingCert.fatherCitizenship || 'FILIPINO',
      '{{FATHER_CITIZENSHIP}}': viewingCert.fatherCitizenship || 'FILIPINO',
      '{{DATE_OF_MARRIAGE}}': formatDateDDMMMYYYY(viewingCert.dateOfMarriage),
      '{{DATE_OF_MARRIAGE_OF_PARENTS}}': formatDateDDMMMYYYY(viewingCert.dateOfMarriage),
      '{{PLACE_OF_MARRIAGE}}': viewingCert.placeOfMarriage || viewingCert.eventPlace || 'N/A',
      '{{PLACE_OF_MARRIAGE_OF_PARENTS}}': viewingCert.placeOfMarriage || viewingCert.eventPlace || 'N/A',
      '{{HUSBAND_NAME}}': viewingCert.personName.split(' / ')[0] || viewingCert.personName,
      '{{WIFE_NAME}}': viewingCert.personName.split(' / ')[1] || viewingCert.spouseOrParentName || '',
      '{{DECEASED_NAME}}': viewingCert.personName,
      '{{DATE_OF_DEATH}}': formatDateDDMMMYYYY(viewingCert.eventDate),
      '{{PLACE_OF_DEATH}}': viewingCert.eventPlace || 'N/A',
      '{{REASON}}': viewingCert.reasonOrDetails || '',
      '{{REMARKS}}': viewingCert.reasonOrDetails || 'AVAILABLE AND FOUND IN BOOK OF LIVE BIRTHS.',
      '{{REMARKS_TEXT}}': viewingCert.reasonOrDetails || 'AVAILABLE AND FOUND IN BOOK OF LIVE BIRTHS.',
      '{{REQUESTED_BY}}': viewingCert.requestedBy || 'THE APPLICANT',
      '{{PURPOSE}}': viewingCert.purpose || 'LEGAL PURPOSES',
      '{{MCR_OFFICER_NAME}}': viewingCert.mcrOfficerName || matchingTemplate?.footer?.signatoryName || siteSettings.mcrOfficerName,
      '{{MCR_OFFICER_TITLE}}': viewingCert.mcrOfficerTitle || matchingTemplate?.footer?.signatoryTitle || siteSettings.mcrOfficerTitle,
      '{{VERIFIER_NAME}}': viewingCert.verifierName || 'IGMEDIO JR. S. TABON',
      '{{VERIFIER_TITLE}}': viewingCert.verifierTitle || 'RCO - II',
      '{{DATE_ISSUED}}': formatDateDDMMMYYYY(viewingCert.dateIssued),
      '{{DATE_PAID}}': formatDateDDMMMYYYY(viewingCert.dateIssued),
      '{{PAYMENT_DATE}}': formatDateDDMMMYYYY(viewingCert.dateIssued),
      '{{OR_NUMBER}}': viewingCert.orNumber,
      '{{AMOUNT_PAID}}': viewingCert.amountPaid,
      '{{SPOUSE_PARENT_NAME}}': viewingCert.spouseOrParentName || '',
      '{{CERT_NUMBER}}': viewingCert.certNumber,
      '{{CERTIFICATE_NUMBER}}': viewingCert.certNumber,
      '{{cert_number}}': viewingCert.certNumber,
      '{{certificate_number}}': viewingCert.certNumber,
      '{{VERIFICATION_CODE}}': viewingCert.certNumber,
      '{{verification_code}}': viewingCert.certNumber,
      '{{QR_CODE}}': includeQrCode ? `<span data-qr="true">${generateQrSvgString(viewingCert.certNumber, 60)}</span>` : '',
      '{{qr_code}}': includeQrCode ? generateQrSvgString(viewingCert.certNumber, 60) : '',
    };

    processed = replacePlaceholders(html, tokens)
      .replace(/\s+for\s+<strong>\{\{PURPOSE\}\}<\/strong>\./gi, '.')
      .replace(/\s+for\s+\{\{PURPOSE\}\}\./gi, '.')
      .replace(/Date Issued:/gi, 'Date Paid:');
    } else {
      processed = html;
    }

    // Clean up duplicate consecutive QR code SVGs or containers if both static SVG and {{QR_CODE}} token were present
    processed = processed.replace(/(<span[^>]*data-qr="true"[^>]*>[\s\S]*?<\/span>)\s*(?:<svg[^>]*shape-rendering="crispEdges"[^>]*>[\s\S]*?<\/svg>)+/gi, '$1');
    processed = processed.replace(/(<svg[^>]*shape-rendering="crispEdges"[^>]*>[\s\S]*?<\/svg>)\s*(?:<svg[^>]*shape-rendering="crispEdges"[^>]*>[\s\S]*?<\/svg>)+/gi, '$1');
    // Clean up any stray closing angle brackets left from earlier tag sanitization
    processed = processed.replace(/(<span[^>]*data-qr="true"[^>]*>[\s\S]*?<\/span>)\s*(?:&gt;|>)/gi, '$1');
    processed = processed.replace(/(<\/span>)\s*(?:&gt;|>)(?=\s*<)/gi, '$1');

    // If QR code is toggled off, remove any residual inline QR tokens/SVGs
    if (!includeQrCode) {
      processed = processed.replace(/<span[^>]*data-qr="true"[^>]*>[\s\S]*?<\/span>/gi, '');
      processed = processed.replace(/<div[^>]*data-qr-box="true"[^>]*>[\s\S]*?<\/div>/gi, '');
      processed = processed.replace(/<svg[^>]*shape-rendering="crispEdges"[^>]*>[\s\S]*?<\/svg>/gi, '');
    }

    const paymentAndQrFooterHtml = `
      <table style="width: 100%; margin-top: 18px; border: none; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.5;" data-payment-qr-footer="true">
        <tbody>
          <tr>
            <td style="vertical-align: top; width: 62%; border: none; padding: 0;">
              <table style="border: none; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.5;">
                <tbody>
                  <tr>
                    <td style="border: none; padding: 1px 6px 1px 0; font-weight: 500;">Amount Paid</td>
                    <td style="border: none; padding: 1px 4px;">:</td>
                    <td style="border: none; padding: 1px 0;">₱ ${viewingCert.amountPaid || '150.00'}</td>
                  </tr>
                  <tr>
                    <td style="border: none; padding: 1px 6px 1px 0; font-weight: 500;">O.R. Number</td>
                    <td style="border: none; padding: 1px 4px;">:</td>
                    <td style="border: none; padding: 1px 0;">${viewingCert.orNumber || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="border: none; padding: 1px 6px 1px 0; font-weight: 500;">Date Paid</td>
                    <td style="border: none; padding: 1px 4px;">:</td>
                    <td style="border: none; padding: 1px 0;">${formatDateDDMMMYYYY(viewingCert.dateIssued)}</td>
                  </tr>
                </tbody>
              </table>
              <div style="margin-top: 10px; font-size: 10px; font-style: italic; color: #1e293b;">
                Note: A mark, erasure or alteration of any entry invalidates this certification.
              </div>
            </td>
            <td style="vertical-align: top; width: 38%; text-align: right; border: none; padding: 0;">
              ${includeQrCode ? `
              <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center;" data-qr-box="true">
                <span style="display: inline-block; border: 1px solid #cbd5e1; padding: 4px; background: #ffffff; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" data-qr="true">
                  ${generateQrSvgString(viewingCert.certNumber, 60)}
                </span>
                <div style="margin-top: 4px; font-family: monospace; font-size: 9.5px; font-weight: bold; color: #1e293b; text-align: center;">
                  ${viewingCert.certNumber}
                </div>
              </div>
              ` : ''}
            </td>
          </tr>
        </tbody>
      </table>
    `;

    if (processed.includes('data-payment-qr-footer="true"')) {
      processed = processed.replace(
        /<table[^>]*data-payment-qr-footer="true"[^>]*>[\s\S]*?<\/table>/gi,
        paymentAndQrFooterHtml
      );
    } else {
      processed = processed.replace(/<div[^>]*>\s*<div>Amount Paid[\s\S]*?invalidates this certification\.<\/div>\s*<\/div>/gi, '');
      const lastCloseDiv = processed.lastIndexOf('</div>');
      if (lastCloseDiv !== -1) {
        processed = processed.substring(0, lastCloseDiv) + paymentAndQrFooterHtml + processed.substring(lastCloseDiv);
      } else {
        processed += paymentAndQrFooterHtml;
      }
    }

    return processed;
  }, [viewingCert, matchingTemplate, siteSettings, includeQrCode]);

  const handlePrint = () => {
    const el = document.getElementById('printable-lcr-certificate-view');
    if (el && viewingCert) {
      executeCertificatePrint(
        el,
        `LCR Form ${viewingCert.formType.replace('LCR_FORM_', '')}${viewingCert.formLetter} - ${viewingCert.certNumber}`
      );
    } else {
      window.print();
    }
  };

  const getFormLabel = (type: string, letter: string) => {
    const num = type.replace('LCR_FORM_', '');
    const event = num === '1' ? 'Birth' : num === '2' ? 'Death' : 'Marriage';
    const status = letter === 'A' ? 'Available' : letter === 'B' ? 'Not Available' : 'Destroyed';
    return {
      title: `LCR Form ${num}${letter}`,
      subtitle: `${event} (${status})`,
    };
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Issued Civil Registry Certifications
              </h2>
              <p className="text-xs text-slate-500">
                Official archive of issued LCR Form 1A/B/C, 2A/B/C, and 3A/B/C certifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDesigner && (
              <button
                type="button"
                onClick={onOpenDesigner}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                title="Open Drag-and-Drop Designer for Municipal Forms 1x, 2x, 3x"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Template Designer (1x, 2x, 3x)</span>
              </button>
            )}
            {isSuperadmin && certifications.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                title="Superadmin: Clean up all training and test certifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clean Up Training Certs</span>
              </button>
            )}
            <button
              onClick={onOpenNewCert}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ NEW CERTIFICATION</span>
            </button>
          </div>
        </div>

        {/* Quick Revenue Strip */}
        <div className="mt-3.5 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <Receipt className="w-4 h-4 text-emerald-600" />
            </span>
            <div>
              <span className="font-bold text-slate-800">Civil Registry Collections:</span>
              <span className="ml-2 text-slate-600 font-mono">
                Current Month: <strong className="text-emerald-700">₱{Math.round(certsRevenue.currentMonthRevenue).toLocaleString()}</strong> (Resets 1st of month)
              </span>
              <span className="mx-2 text-slate-300">•</span>
              <span className="text-slate-600 font-mono">
                Current Year: <strong className="text-blue-700">₱{Math.round(certsRevenue.currentYearRevenue).toLocaleString()}</strong> (Resets Jan 1)
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 self-end sm:self-auto">
            <span>Next Mo Reset: {certsRevenue.monthlyResetDateFormatted}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              id="issued-certs-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by owner's name, LCR registration #, cert #, O.R. #..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">All LCR Form Types</option>
              <option value="LCR_FORM_1">LCR Form 1 (Birth)</option>
              <option value="LCR_FORM_2">LCR Form 2 (Death)</option>
              <option value="LCR_FORM_3">LCR Form 3 (Marriage)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={letterFilter}
              onChange={(e) => setLetterFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">All Status Letters (A, B, C)</option>
              <option value="A">Letter A (Available)</option>
              <option value="B">Letter B (Not Available)</option>
              <option value="C">Letter C (Destroyed/Lost)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions Banner (Superadmin Only) */}
      {selectedIds.length > 0 && isSuperadmin && (
        <div className="mb-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="font-bold text-blue-900">
              {selectedIds.length} {selectedIds.length === 1 ? 'certificate' : 'certificates'} selected
            </span>
            <span className="text-blue-300">|</span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-blue-700 hover:text-blue-900 font-medium underline cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
          <button
            type="button"
            onClick={() => setBulkDeleteTargetIds(selectedIds)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bulk Delete Selected ({selectedIds.length})</span>
          </button>
        </div>
      )}

      {/* Certifications Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {filteredCerts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Award className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">
              {searchQuery ? 'No matching certifications found' : 'No certifications found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery ? (
                <>No certifications match &ldquo;{searchQuery}&rdquo;. Try checking the owner&apos;s name or LCR registration number.</>
              ) : (
                <>Issue an official LCR Form 1, 2, or 3 certification directly from any indexed record or from the button above.</>
              )}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear search filter</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  {isSuperadmin && (
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredCerts.length > 0 && filteredCerts.every((c) => selectedIds.includes(c.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const allVisible = filteredCerts.map((c) => c.id);
                            setSelectedIds(Array.from(new Set([...selectedIds, ...allVisible])));
                          } else {
                            const visibleSet = new Set(filteredCerts.map((c) => c.id));
                            setSelectedIds(selectedIds.filter((id) => !visibleSet.has(id)));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="Select All Visible Certifications"
                      />
                    </th>
                  )}
                  <th className="py-3 px-4">Cert # / Form Code</th>
                  <th className="py-3 px-4">Subject Person & Purpose</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Status Letter</th>
                  <th className="py-3 px-4 hidden md:table-cell">O.R. # & Fee</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Date Issued</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCerts.map((c) => {
                  const meta = getFormLabel(c.formType, c.formLetter);
                  const isRowSelected = selectedIds.includes(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`transition ${isRowSelected ? 'bg-blue-50/50 hover:bg-blue-50/70' : 'hover:bg-slate-50/80'}`}
                    >
                      {isSuperadmin && (
                        <td className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds([...selectedIds, c.id]);
                              } else {
                                setSelectedIds(selectedIds.filter((id) => id !== c.id));
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{c.certNumber}</span>
                        <span className="text-[11px] text-blue-600 font-semibold font-mono">{meta.title}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block text-sm">{c.personName}</span>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2">
                          {c.registryNumber && (
                            <span className="font-mono font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                              LCR Reg #{c.registryNumber}
                            </span>
                          )}
                          <span>Req by: {c.requestedBy} • {c.purpose}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span
                          className={`status-badge ${
                            c.formLetter === 'A'
                              ? 'status-a'
                              : c.formLetter === 'B'
                              ? 'status-b'
                              : 'status-c'
                          }`}
                        >
                          {c.formLetter === 'A' ? 'A (Available)' : c.formLetter === 'B' ? 'B (Not Available)' : 'C (Destroyed)'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 hidden md:table-cell">
                        <span className="text-slate-900 block font-bold">{c.orNumber}</span>
                        <span className="text-[11px] text-slate-500">₱ {c.amountPaid}</span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500 hidden lg:table-cell">
                        <span className="text-slate-700 block font-semibold">{formatDateDDMMMYYYY(c.dateIssued)}</span>
                        <span className="text-[10px] text-slate-400">by @{c.issuedByUsername}</span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const hasQr = c.verificationCode !== '' && c.verificationCode !== undefined;
                              setIncludeQrCode(hasQr);
                              setViewingCert(c);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>View & Print</span>
                          </button>
                          {isSuperadmin && (
                            <button
                              type="button"
                              onClick={() => setCertToDelete(c)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Superadmin: Delete certificate record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View & Print Modal for specific certification */}
      {viewingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
            <div className="px-6 py-3.5 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-mono">{viewingCert.certNumber}</h3>
                  <p className="text-xs text-slate-500">
                    Official Certificate: {getFormLabel(viewingCert.formType, viewingCert.formLetter).title}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <label className="inline-flex items-center text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs cursor-pointer select-none hover:bg-slate-50 transition">
                  <input
                    type="checkbox"
                    checked={includeQrCode}
                    onChange={(e) => setIncludeQrCode(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 mr-1.5 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <QrCode className="w-3.5 h-3.5 text-blue-600 mr-1 shrink-0" />
                  <span className="hidden sm:inline">Include QR</span>
                  <span className="sm:hidden">QR</span>
                </label>
                {isSuperadmin && (
                  <button
                    type="button"
                    onClick={() => setCertToDelete(viewingCert)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                    title="Superadmin: Delete this certificate record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Save as PDF / Print (8.5 × 13 in / PH Legal)</span>
                </button>
                <button
                  onClick={() => setViewingCert(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Certificate Sheet Preview */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              <div
                id="printable-lcr-certificate-view"
                className="w-full max-w-[816px] min-h-[1150px] bg-white text-slate-950 p-8 sm:p-12 shadow-2xl rounded-sm font-serif border border-slate-300 relative print:p-0 print:shadow-none print:border-none overflow-hidden"
              >
                {/* Official Municipal Seal / Watermark Background */}
                {(() => {
                  const bgImage =
                    viewingCert.customBackgroundUrl ||
                    matchingTemplate?.customBackgroundUrl ||
                    matchingTemplate?.watermark?.imageUrl ||
                    (matchingTemplate?.watermark as any)?.customImageUrl ||
                    (matchingTemplate as any)?.backgroundWatermarkUrl ||
                    siteSettings.sealUrl;
                  const bgOpacity =
                    ((viewingCert.backgroundOpacityPercent ??
                      matchingTemplate?.backgroundOpacityPercent ??
                      matchingTemplate?.watermark?.opacityPercent ??
                      10) / 100);
                  const isWatermarkEnabled =
                    Boolean(bgImage) && matchingTemplate?.watermark?.enabled !== false;

                  if (!isWatermarkEnabled || !bgImage) return null;

                  return (
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
                      style={{
                        opacity: bgOpacity,
                        transform: matchingTemplate?.watermark?.rotationDegrees
                          ? `rotate(${matchingTemplate.watermark.rotationDegrees}deg)`
                          : undefined,
                        zIndex: 0,
                      }}
                    >
                      <img
                        src={bgImage}
                        alt="Official Watermark"
                        className="max-w-[440px] max-h-[440px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  );
                })()}

                <div className="relative z-10">
                  {processedWysiwygHtml ? (
                    <div
                      className="wysiwyg-rendered-certificate p-2 text-slate-900 leading-normal font-serif"
                      dangerouslySetInnerHTML={{
                        __html: processedWysiwygHtml,
                      }}
                    />
                  ) : (
                    <>
                      {/* Header with Official Seals */}
                      <div
                        className="pb-4 mb-5"
                        style={{
                          borderBottomWidth: `${matchingTemplate?.header?.dividerThickness ?? 2}px`,
                          borderBottomColor: matchingTemplate?.header?.dividerColor || '#0f172a',
                          borderBottomStyle: 'solid',
                        }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* Left Seal */}
                          {matchingTemplate?.logos?.showLeftLogo !== false && (
                            <div className="shrink-0 flex items-center justify-center w-16 h-16">
                              {matchingTemplate?.logos?.leftLogoUrl || siteSettings.sealUrl ? (
                                <img
                                  src={matchingTemplate?.logos?.leftLogoUrl || siteSettings.sealUrl}
                                  alt="Official Seal"
                                  className="w-16 h-16 object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-full border-2 border-slate-900 bg-amber-50 flex flex-col items-center justify-center text-center p-1">
                                  <span className="text-[8px] font-black text-slate-900 uppercase leading-none font-sans">
                                    {siteSettings.municipality.slice(0, 4)}
                                  </span>
                                  <Building2 className="w-5 h-5 text-slate-800 my-0.5" />
                                  <span className="text-[6px] font-bold text-slate-700 leading-none">OFFICIAL SEAL</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Center Republic Header */}
                          <div className="text-center flex-1 space-y-0.5">
                            <p className="text-xs font-sans tracking-widest text-slate-600 uppercase">
                              {matchingTemplate?.header?.countryText || 'Republic of the Philippines'}
                            </p>
                            <p className="text-xs font-sans font-semibold tracking-wider text-slate-700 uppercase">
                              Province of {matchingTemplate?.header?.provinceText || siteSettings.province}
                            </p>
                            <p className="text-xs font-sans font-bold tracking-wider text-slate-900 uppercase">
                              Municipality of {matchingTemplate?.header?.municipalityText || siteSettings.municipality}
                            </p>
                            <h1 className="text-sm font-sans font-black tracking-wide text-slate-950 uppercase pt-1">
                              {matchingTemplate?.header?.officeNameText || siteSettings.officeName}
                            </h1>
                          </div>

                          {/* Right Seal */}
                          {matchingTemplate?.logos?.showRightLogo !== false && (
                            <div className="shrink-0 flex items-center justify-center w-16 h-16">
                              {matchingTemplate?.logos?.rightLogoUrl || siteSettings.sealUrl ? (
                                <img
                                  src={matchingTemplate?.logos?.rightLogoUrl || siteSettings.sealUrl}
                                  alt="LCR Seal"
                                  className="w-16 h-16 object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-full border-2 border-slate-900 bg-blue-50 flex flex-col items-center justify-center text-center p-1">
                                  <span className="text-[7px] font-black text-blue-900 uppercase leading-none font-sans">
                                    PILIPINAS
                                  </span>
                                  <Award className="w-5 h-5 text-blue-800 my-0.5" />
                                  <span className="text-[6px] font-bold text-blue-700 leading-none">LCR OFFICE</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Meta details */}
                      <div className="flex items-center justify-between text-xs font-sans mb-6">
                        <div>
                          <span className="font-bold text-slate-900 text-sm border-b border-slate-900 pb-0.5">
                            LCR FORM NO. {viewingCert.formType.replace('LCR_FORM_', '')}
                            {viewingCert.formLetter}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-600 block text-[11px]">
                            Date: <strong>{formatDateDDMMMYYYY(viewingCert.dateIssued)}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="text-center my-6">
                        <h2 className="text-base sm:text-lg font-black tracking-wider uppercase underline underline-offset-4 text-slate-950 font-sans">
                          {viewingCert.formType === 'LCR_FORM_1'
                            ? 'CERTIFICATION OF BIRTH'
                            : viewingCert.formType === 'LCR_FORM_2'
                            ? 'CERTIFICATION OF DEATH'
                            : 'CERTIFICATION OF MARRIAGE'}{' '}
                          ({viewingCert.formLetter === 'A'
                            ? 'AVAILABLE'
                            : viewingCert.formLetter === 'B'
                            ? 'NOT AVAILABLE'
                            : 'DESTROYED / LOST'})
                        </h2>
                      </div>

                      {/* Body Text */}
                      <div className="text-sm space-y-4 leading-relaxed text-slate-900">
                        <p className="font-bold font-sans tracking-wide">TO WHOM IT MAY CONCERN:</p>

                        {viewingCert.formLetter === 'A' && (
                          <>
                            <p className="indent-8 text-justify">
                              This is to certify that according to the Civil Registry Records archived in this office, the civil
                              status record of{' '}
                              <span className="font-bold text-base uppercase underline">{viewingCert.personName}</span> is{' '}
                              <strong>AVAILABLE</strong> and duly registered under the following book particulars:
                            </p>

                            <div className="my-4 border border-slate-800 font-sans text-xs">
                              <div className="grid grid-cols-2 border-b border-slate-800 p-2 bg-slate-50">
                                <span className="font-semibold text-slate-700">Registry Number:</span>
                                <span className="font-bold font-mono text-slate-900">
                                  {viewingCert.registryNumber || 'N/A'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 border-b border-slate-800 p-2">
                                <span className="font-semibold text-slate-700">Book Number:</span>
                                <span className="font-bold font-mono text-slate-900">
                                  {viewingCert.bookNumber || 'N/A'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 border-b border-slate-800 p-2 bg-slate-50">
                                <span className="font-semibold text-slate-700">Page Number:</span>
                                <span className="font-bold font-mono text-slate-900">
                                  {viewingCert.pageNumber || 'N/A'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 border-b border-slate-800 p-2">
                                <span className="font-semibold text-slate-700">Date & Place of Event:</span>
                                <span className="font-bold font-mono text-slate-900">
                                  {formatDateDDMMMYYYY(viewingCert.eventDate)} at {viewingCert.eventPlace || 'N/A'}
                                </span>
                              </div>
                              {viewingCert.spouseOrParentName && (
                                <div className="grid grid-cols-2 p-2 bg-slate-50">
                                  <span className="font-semibold text-slate-700">Parents / Solemnizing:</span>
                                  <span className="font-bold text-slate-900">{viewingCert.spouseOrParentName}</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {viewingCert.formLetter === 'B' && (
                          <p className="indent-8 text-justify">
                            This is to certify that after a diligent and thorough verification made in the civil registry
                            archive records of this municipality, the record of{' '}
                            <span className="font-bold text-base uppercase underline">{viewingCert.personName}</span>, who was
                            reportedly born/married/died on <strong>{formatDateDDMMMYYYY(viewingCert.eventDate)}</strong> at{' '}
                            <strong>{viewingCert.eventPlace || 'N/A'}</strong>, does{' '}
                            <strong>NOT APPEAR OR CANNOT BE FOUND</strong> in the Civil Registry Books.
                          </p>
                        )}

                        {viewingCert.formLetter === 'C' && (
                          <p className="indent-8 text-justify">
                            This is to certify that the civil register books covering the year{' '}
                            <strong>{viewingCert.eventDate ? viewingCert.eventDate.split('-')[0] : 'PERTAINING PERIOD'}</strong>,
                            including the entry of{' '}
                            <span className="font-bold text-base uppercase underline">{viewingCert.personName}</span>, are{' '}
                            <strong>DESTROYED / LOST / UNAVAILABLE</strong> in this office due to force majeure / fire / typhoon / wear and tear.
                          </p>
                        )}

                        {viewingCert.reasonOrDetails && (
                          <div className="p-2.5 bg-slate-50 border-l-2 border-slate-900 text-xs italic">
                            <strong>Remarks / Annotation:</strong> {viewingCert.reasonOrDetails}
                          </div>
                        )}

                        <p className="indent-8 text-justify">
                          This certification is issued upon the request of{' '}
                          <strong>{viewingCert.requestedBy || 'THE INTERESTED PARTY'}</strong>.
                        </p>
                      </div>

                      {/* Signatory & Official Seal */}
                      <div className="mt-8 pt-2 flex items-start justify-between font-sans gap-6">
                        {/* Left Column: VERIFIED BY */}
                        <div className="text-left font-sans text-xs min-w-[240px]">
                          <div className="font-bold text-slate-900 tracking-wide text-xs mb-3">
                            VERIFIED BY:
                          </div>

                          <div className="text-center w-60 my-2">
                            <div className="font-bold text-slate-950 text-sm uppercase font-sans">
                              {viewingCert.verifierName || 'IGMEDIO JR. S. TABON'}
                            </div>
                            <div className="text-xs text-slate-800 font-medium mt-0.5">
                              {viewingCert.verifierTitle || 'RCO - II'}
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Municipal Civil Registrar Signatory */}
                        <div className="text-center min-w-[240px] pt-4 flex flex-col items-center">
                          <div className="text-center w-full">
                            <div className="border-b border-slate-900 pb-1 mb-1 font-bold text-xs uppercase text-slate-950">
                              {viewingCert.mcrOfficerName || matchingTemplate?.footer?.signatoryName || siteSettings.mcrOfficerName}
                            </div>
                            <div className="text-[11px] text-slate-800 font-medium">
                              {viewingCert.mcrOfficerTitle || matchingTemplate?.footer?.signatoryTitle || siteSettings.mcrOfficerTitle}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Auto-included Area: Payment Particulars & Security QR Verification */}
                      <div className="mt-6 pt-3 border-t border-slate-200">
                        <div className="flex items-start justify-between gap-4 font-sans text-xs">
                          {/* Left: Payment Details & Alteration Note */}
                          <div className="text-left space-y-1">
                            <table className="border-none text-xs font-sans">
                              <tbody>
                                <tr>
                                  <td className="pr-3 py-0.5 font-medium text-slate-800">Amount Paid</td>
                                  <td className="pr-2 py-0.5">:</td>
                                  <td className="py-0.5 font-semibold text-slate-900">₱ {viewingCert.amountPaid || '150.00'}</td>
                                </tr>
                                <tr>
                                  <td className="pr-3 py-0.5 font-medium text-slate-800">O.R. Number</td>
                                  <td className="pr-2 py-0.5">:</td>
                                  <td className="py-0.5 font-semibold text-slate-900">{viewingCert.orNumber || 'N/A'}</td>
                                </tr>
                                <tr>
                                  <td className="pr-3 py-0.5 font-medium text-slate-800">Date Paid</td>
                                  <td className="pr-2 py-0.5">:</td>
                                  <td className="py-0.5 font-semibold text-slate-900">{formatDateDDMMMYYYY(viewingCert.dateIssued)}</td>
                                </tr>
                              </tbody>
                            </table>
                            <div className="pt-2 text-[11px] text-slate-800 italic">
                              Note: A mark, erasure or alteration of any entry invalidates this certification.
                            </div>
                          </div>

                          {/* Right: Security QR Code & Certificate Number */}
                          {includeQrCode && (
                            <div className="flex flex-col items-center justify-center shrink-0">
                              <div className="p-1 border border-slate-300 bg-white rounded shadow-2xs">
                                <QrCodeSvg value={viewingCert.certNumber} size={60} />
                              </div>
                              <div className="mt-1 text-[9.5px] font-mono font-bold text-slate-900 text-center tracking-tight">
                                {viewingCert.certNumber}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {matchingTemplate?.footer?.notes && (
                        <div className="mt-4 pt-2 border-t border-dotted border-slate-300 text-[10px] text-slate-600 italic">
                          {matchingTemplate.footer.notes}
                        </div>
                      )}
                    </>
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Superadmin Deletion & Cleanup In-App Confirmation Modal */}
      {(certToDelete || bulkDeleteTargetIds || showClearAllConfirm) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {showClearAllConfirm
                      ? 'Clean Up All Training Certifications'
                      : bulkDeleteTargetIds
                      ? 'Confirm Bulk Deletion'
                      : 'Delete Issued Certification'}
                  </h3>
                  <p className="text-xs text-slate-500">Superadmin Privilege Only</p>
                </div>
              </div>

              {certToDelete && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Certificate No:</span>
                    <span className="font-mono font-bold text-blue-600">{certToDelete.certNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Form & Type:</span>
                    <span className="font-semibold text-slate-800">
                      {getFormLabel(certToDelete.formType, certToDelete.formLetter).title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subject Person:</span>
                    <span className="font-bold text-slate-900">{certToDelete.personName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">O.R. No. / Fee:</span>
                    <span className="font-mono text-slate-700">
                      {certToDelete.orNumber} (₱{certToDelete.amountPaid})
                    </span>
                  </div>
                </div>
              )}

              {bulkDeleteTargetIds && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 mb-3 font-medium">
                  You are about to permanently delete <span className="font-bold">{bulkDeleteTargetIds.length} issued certifications</span>. This will purge test/training logs and update registry counts.
                </div>
              )}

              {showClearAllConfirm && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 mb-3 font-medium">
                  Warning: You are about to clear all <span className="font-bold">{certifications.length} issued certifications</span> from the database. This permanently purges test and training certificate logs.
                </div>
              )}

              <p className="text-xs text-slate-500 mb-4">
                This action is permanently audited under your Superadmin account (@{currentUser.username}). Are you sure you wish to proceed?
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCertToDelete(null);
                    setBulkDeleteTargetIds(null);
                    setShowClearAllConfirm(false);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showClearAllConfirm) {
                      if (onClearAllCertifications) {
                        onClearAllCertifications();
                      }
                      setShowClearAllConfirm(false);
                      setSelectedIds([]);
                    } else if (bulkDeleteTargetIds) {
                      if (onBulkDeleteCertifications) {
                        onBulkDeleteCertifications(bulkDeleteTargetIds);
                      }
                      setBulkDeleteTargetIds(null);
                      setSelectedIds([]);
                    } else if (certToDelete) {
                      if (onDeleteCertification) {
                        onDeleteCertification(certToDelete);
                      }
                      if (viewingCert?.id === certToDelete.id) {
                        setViewingCert(null);
                      }
                      setCertToDelete(null);
                      setSelectedIds((prev) => prev.filter((id) => id !== certToDelete.id));
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {showClearAllConfirm
                      ? 'Permanently Clean Up All'
                      : bulkDeleteTargetIds
                      ? `Permanently Delete (${bulkDeleteTargetIds.length})`
                      : 'Permanently Delete'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

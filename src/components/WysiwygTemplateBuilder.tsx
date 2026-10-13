import React, { useState, useRef, useEffect } from 'react';
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Image as ImageIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Code,
  Upload,
  Plus,
  Info,
  ChevronDown,
  ChevronRight,
  X,
  FileText,
  Printer,
  RotateCcw,
  Sliders,
  Check,
  Eye,
  Trash2,
  Award,
  QrCode,
  Link as LinkIcon,
  Minus,
  Scissors,
  Copy,
  Clipboard,
  MoreHorizontal,
  Palette,
  Outdent,
  Indent,
  Grid,
} from 'lucide-react';
import { MunicipalCertificateTemplate, SiteSettings, UserAccount } from '../types';
import { CERTIFICATE_PLACEHOLDERS, PlaceholderDefinition } from '../services/templates';
import { formatDateDDMMMYYYY } from '../utils/dateUtils';
import { generateQrSvgString } from './PublicVerificationView';

interface WysiwygTemplateBuilderProps {
  template: MunicipalCertificateTemplate;
  siteSettings: SiteSettings;
  currentUser: UserAccount | null;
  onSave: (updatedTemplate: MunicipalCertificateTemplate) => void;
  onBack: () => void;
}

export const WysiwygTemplateBuilder: React.FC<WysiwygTemplateBuilderProps> = ({
  template,
  siteSettings,
  currentUser: _currentUser,
  onSave,
  onBack,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  // States
  const [backgroundUrl, setBackgroundUrl] = useState<string>(
    template.customBackgroundUrl || template.watermark.imageUrl || ''
  );
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(
    template.backgroundOpacityPercent || template.watermark.opacityPercent || 12
  );
  const [isPlaceholderMenuOpen, setIsPlaceholderMenuOpen] = useState<boolean>(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState<boolean>(false);
  const [activeDropdownMenu, setActiveDropdownMenu] = useState<string | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  // TinyMCE Visual Aids State (matching screenshot 4)
  const [visualAids, setVisualAids] = useState<boolean>(true);

  // Interactive 10x10 Table Grid picker state (matching screenshot 8)
  const [hoverGrid, setHoverGrid] = useState<{ cols: number; rows: number } | null>(null);

  // Cut / Copy / Paste row clipboard
  const [copiedRowHtml, setCopiedRowHtml] = useState<string | null>(null);

  // Image insertion modal state
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageWidth, setImageWidth] = useState<string>('');
  const [imageAlt, setImageAlt] = useState<string>('');

  // Link insertion modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState<boolean>(false);
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [linkText, setLinkText] = useState<string>('');

  // Table Properties modal state
  const [isTablePropsModalOpen, setIsTablePropsModalOpen] = useState<boolean>(false);
  const [tableWidth, setTableWidth] = useState<string>('100%');
  const [tableAlignment, setTableAlignment] = useState<string>('none');
  const [tableCellPadding, setTableCellPadding] = useState<number>(6);
  const [tableCellSpacing, setTableCellSpacing] = useState<number>(0);
  const [tableBorderSize, setTableBorderSize] = useState<number>(1);
  const [tableBorderColor, setTableBorderColor] = useState<string>('#94a3b8');
  const [tableBgColor, setTableBgColor] = useState<string>('#ffffff');

  // Table creation state
  const [tableRows, setTableRows] = useState<number>(3);
  const [tableCols, setTableCols] = useState<number>(2);

  // Raw HTML state for source code dialog
  const [rawHtml, setRawHtml] = useState<string>('');

  // Current DOM node path for bottom status bar (e.g., "p", "table > tr > td")
  const [elementPath, setElementPath] = useState<string>('p');
  const [wordCount, setWordCount] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Official Isabela / Municipal Seal SVG (matching user screenshot 1)
  const isabelaSealSvg = `
    <svg width="68" height="68" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">
      <circle cx="50" cy="50" r="48" fill="#1e3a8a" stroke="#d97706" stroke-width="3"/>
      <circle cx="50" cy="50" r="41" fill="#f8fafc" stroke="#d97706" stroke-width="1.5"/>
      <!-- Outer golden star rays -->
      <g fill="#d97706">
        <polygon points="50,12 52,18 48,18"/>
        <polygon points="50,88 52,82 48,82"/>
        <polygon points="12,50 18,52 18,48"/>
        <polygon points="88,50 82,52 82,48"/>
        <polygon points="23,23 28,27 25,29"/>
        <polygon points="77,23 72,27 75,29"/>
        <polygon points="23,77 28,73 25,71"/>
        <polygon points="77,77 72,73 75,71"/>
      </g>
      <!-- Shield inside -->
      <path d="M 32 30 L 68 30 L 68 55 C 68 68 50 78 50 78 C 50 78 32 68 32 55 Z" fill="#2563eb" stroke="#d97706" stroke-width="2"/>
      <path d="M 32 30 L 50 30 L 50 78 C 50 78 32 68 32 55 Z" fill="#dc2626"/>
      <!-- Sun rays on top of shield -->
      <circle cx="50" cy="42" r="6" fill="#fbbf24"/>
      <!-- Golden ribbon at bottom -->
      <path d="M 26 80 Q 50 86 74 80 L 71 85 Q 50 91 29 85 Z" fill="#d97706"/>
      <text x="50" y="24" font-size="5" font-family="Arial, sans-serif" font-weight="bold" fill="#1e3a8a" text-anchor="middle">PROVINCE OF ISABELA</text>
      <text x="50" y="84" font-size="4" font-family="Arial, sans-serif" font-weight="bold" fill="#ffffff" text-anchor="middle">OFFICIAL SEAL</text>
    </svg>
  `;

  // Official Bagong Pilipinas Logo SVG (matching user screenshot 1)
  const bagongPilipinasSvg = `
    <svg width="72" height="72" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">
      <circle cx="50" cy="50" r="48" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
      <!-- Dynamic circular ribbon arcs in red, blue, gold -->
      <path d="M 22 45 A 32 32 0 0 1 78 45" fill="none" stroke="#2563eb" stroke-width="7" stroke-linecap="round"/>
      <path d="M 78 55 A 32 32 0 0 1 22 55" fill="none" stroke="#dc2626" stroke-width="7" stroke-linecap="round"/>
      <!-- 8-ray golden sun in center -->
      <circle cx="50" cy="50" r="10" fill="#f59e0b"/>
      <g stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round">
        <line x1="50" y1="34" x2="50" y2="38"/>
        <line x1="50" y1="62" x2="50" y2="66"/>
        <line x1="34" y1="50" x2="38" y2="50"/>
        <line x1="62" y1="50" x2="66" y2="50"/>
        <line x1="39" y1="39" x2="42" y2="42"/>
        <line x1="58" y1="58" x2="61" y2="61"/>
        <line x1="39" y1="61" x2="42" y2="58"/>
        <line x1="58" y1="42" x2="61" y2="39"/>
      </g>
      <!-- Stars -->
      <polygon points="50,22 52,26 56,26 53,28 54,32 50,29 46,32 47,28 44,26 48,26" fill="#f59e0b"/>
      <!-- Typography -->
      <text x="50" y="78" font-size="5" font-family="Arial, sans-serif" font-weight="900" fill="#1e3a8a" text-anchor="middle" letter-spacing="1">BAGONG PILIPINAS</text>
    </svg>
  `;

  // Specimen Business Permit HTML (Exact specimen layout matching user screenshot 1 & 2)
  const businessPermitHtml = `
    <div style="font-family: Arial, sans-serif; color: #000; padding: 10px; max-width: 720px; margin: 0 auto; line-height: 1.35;">
      <!-- Header 3-Column Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
        <tbody>
          <tr>
            <td style="width: 25%; vertical-align: top; text-align: left; font-size: 10.5px; padding: 4px;">
              <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">[mode_of_payment]</div>
              <div style="color: #334155; font-size: 9.5px; line-height: 1.2;">[activity_type][activities][area]</div>
              <div style="margin-top: 8px;">
                ${isabelaSealSvg}
              </div>
            </td>
            <td style="width: 50%; vertical-align: middle; text-align: center; padding: 4px;">
              <div style="font-size: 11px; font-weight: normal; color: #334155;">Republic of the Philippines</div>
              <div style="font-size: 11px; font-weight: normal; color: #334155;">Province of Isabela</div>
              <div style="font-size: 12px; font-weight: bold; color: #0f172a; text-transform: uppercase;">Municipality of {{MUNICIPALITY}}</div>
              <div style="font-size: 11.5px; font-weight: bold; color: #1e3a8a; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">OFFICE OF THE MUNICIPAL MAYOR</div>
              <div style="font-size: 20px; font-weight: 900; color: #000000; margin: 10px 0 4px 0; letter-spacing: 1.5px; text-decoration: underline;">BUSINESS PERMIT</div>
            </td>
            <td style="width: 25%; vertical-align: top; text-align: center; padding: 4px;">
              <div style="margin-top: 14px;">
                ${bagongPilipinasSvg}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Main Permit Data Table with Light Blue Headers (Matching screenshot 1 & 2) -->
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11.5px; border: 1px solid #94a3b8;">
        <tbody>
          <tr style="background-color: #e2edf8;">
            <td style="border: 1px solid #94a3b8; padding: 6px 10px; width: 28%; font-weight: bold; color: #1e3a8a;">Business Permit No.</td>
            <td style="border: 1px solid #94a3b8; padding: 6px 10px; width: 36%; font-weight: bold; font-family: monospace;">[cda_no]</td>
            <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: bold; color: #1e3a8a;">Business ID No.: <span style="font-family: monospace; font-weight: bold; color: #000;">[bin]</span></td>
          </tr>
          <tr>
            <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: bold; background-color: #f8fafc;">Business Name:</td>
            <td colspan="2" style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: bold; text-transform: uppercase;">[business_name]</td>
          </tr>
          <tr>
            <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: bold; background-color: #f8fafc;">Owner's Name:</td>
            <td colspan="2" style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: bold; text-transform: uppercase;">[owners_display_name]</td>
          </tr>
          <tr>
            <td style="border: 1px solid #94a3b8; padding: 6px 10px; font-weight: bold; background-color: #f8fafc;">Business Address:</td>
            <td colspan="2" style="border: 1px solid #94a3b8; padding: 6px 10px;">[display_address]</td>
          </tr>
        </tbody>
      </table>

      <!-- Permit Body Text -->
      <div style="font-size: 11.5px; text-align: justify; line-height: 1.6; margin: 14px 0 10px 0;">
        <p style="margin: 0 0 8px 0;">
          is hereby granted this <strong>BUSINESS PERMIT</strong> to operate the business / commercial activity mentioned above pursuant to the existing Revenue Code and Municipal Ordinances, subject to the conditions that the laws, ordinances, rules and regulations governing the business are strictly complied with.
        </p>
        <p style="margin: 0; font-size: 11px; color: #334155;">
          This permit is valid until <strong>December 31, 2026</strong> unless sooner revoked or cancelled for cause.
        </p>
      </div>

      <!-- Signatures & Details -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 11px;">
        <tbody>
          <tr>
            <td style="width: 50%; vertical-align: top; padding: 4px;">
              <div>Date Issued: <strong>[date_issued]</strong></div>
              <div>O.R. No.: <strong>{{OR_NUMBER}}</strong></div>
              <div>Amount Paid: <strong>&#8369; {{AMOUNT_PAID}}</strong></div>
            </td>
            <td style="width: 50%; vertical-align: top; text-align: center; padding: 4px;">
              <div style="border-bottom: 1.5px solid #000; width: 220px; margin: 24px auto 4px auto; font-weight: bold; text-transform: uppercase;">
                {{MCR_OFFICER_NAME}}
              </div>
              <div style="font-size: 11px; font-weight: bold; color: #1e3a8a;">Municipal Mayor</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // Form 1A (Birth) 13 Official Particulars Table HTML
  const form1AParticularsTableHtml = `
    <!-- LCR Form 1A Particulars Table (13 Official Fields) -->
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-family: Arial, sans-serif; font-size: 11.5px; border: 1px solid #1e293b;">
      <tbody>
        <tr style="background-color: #f8fafc; border-bottom: 1px solid #1e293b;">
          <td style="padding: 6px 12px; width: 42%; font-weight: bold; border-right: 1px solid #1e293b;">REGISTRY NO:</td>
          <td style="padding: 6px 12px; font-family: monospace; font-weight: bold;">{{REGISTRY_NO}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 6px 12px; font-weight: bold; border-right: 1px solid #1e293b;">DATE OF REGISTRATION:</td>
          <td style="padding: 6px 12px;">{{DATE_OF_REGISTRATION}}</td>
        </tr>
        <tr style="background-color: #f8fafc; border-bottom: 1px solid #1e293b;">
          <td style="padding: 6px 12px; font-weight: bold; border-right: 1px solid #1e293b;">NAME OF CHILD:</td>
          <td style="padding: 6px 12px; font-weight: bold; text-transform: uppercase;">{{NAME_OF_CHILD}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 6px 12px; font-weight: bold; border-right: 1px solid #1e293b;">SEX:</td>
          <td style="padding: 6px 12px;">{{SEX}}</td>
        </tr>
        <tr style="background-color: #f8fafc; border-bottom: 1px solid #1e293b;">
          <td style="padding: 6px 12px; font-weight: bold; border-right: 1px solid #1e293b;">DATE OF BIRTH:</td>
          <td style="padding: 6px 12px;">{{DATE_OF_BIRTH}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 6px 12px; font-weight: bold; border-right: 1px solid #1e293b;">PLACE OF BIRTH:</td>
          <td style="padding: 6px 12px;">{{PLACE_OF_BIRTH}}</td>
        </tr>
        <tr style="background-color: #f8fafc; border-bottom: 1px solid #1e293b;">
          <td style="padding: 6px 12px; font-weight: bold; border-right: 1px solid #1e293b;">NAME OF MOTHER:</td>
          <td style="padding: 6px 12px;">{{NAME_OF_MOTHER}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 6px 12px; font-weight: bold; border-right: 1px solid #1e293b;">CITIZENSHIP OF THE MOTHER:</td>
          <td style="padding: 6px 12px;">{{CITIZENSHIP_OF_MOTHER}}</td>
        </tr>
        <tr style="background-color: #f8fafc; border-bottom: 1px solid #1e293b;">
          <td style="padding: 6px 12px; font-weight: bold; border-right: 1px solid #1e293b;">NAME OF THE FATHER:</td>
          <td style="padding: 6px 12px;">{{NAME_OF_FATHER}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 6px 12px; font-weight: bold; border-right: 1px solid #1e293b;">CITIZENSHIP OF THE FATHER:</td>
          <td style="padding: 6px 12px;">{{CITIZENSHIP_OF_FATHER}}</td>
        </tr>
        <tr style="background-color: #f8fafc; border-bottom: 1px solid #1e293b;">
          <td style="padding: 6px 12px; font-weight: bold; border-right: 1px solid #1e293b;">DATE OF MARRIAGE:</td>
          <td style="padding: 6px 12px;">{{DATE_OF_MARRIAGE}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 6px 12px; font-weight: bold; border-right: 1px solid #1e293b;">PLACE OF MARRIAGE:</td>
          <td style="padding: 6px 12px;">{{PLACE_OF_MARRIAGE}}</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="padding: 6px 12px; font-weight: bold; border-right: 1px solid #1e293b;">REMARKS:</td>
          <td style="padding: 6px 12px;">{{REMARKS}}</td>
        </tr>
      </tbody>
    </table>
  `;

  // Dual Signatory HTML Snippet (Specimen Accurate: Verifier + Payment + Note and Municipal Civil Registrar)
  const dualSignatoryHtmlSnippet = `
    <!-- Signatories & Verification (Specimen-Accurate Layout) -->
    <div style="margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-start; font-family: Arial, sans-serif;">
      <!-- Left: VERIFIED BY + Payment Details + Note -->
      <div style="font-size: 12px; color: #0f172a; line-height: 1.5; min-width: 270px; text-align: left;">
        <div style="font-weight: bold; margin-bottom: 12px; font-size: 12px;">VERIFIED BY:</div>
        <div style="text-align: center; width: 240px; margin-bottom: 16px;">
          <div style="font-weight: bold; font-size: 13px; text-transform: uppercase;">{{VERIFIER_NAME}}</div>
          <div style="font-size: 12px; color: #1e293b; margin-top: 2px;">{{VERIFIER_TITLE}}</div>
        </div>
        <div style="margin-bottom: 16px; font-size: 12px; line-height: 1.6;">
          <div>Amount Paid :  &#8369; {{AMOUNT_PAID}}</div>
          <div>O.R. Number : {{OR_NUMBER}}</div>
          <div>Date Paid   : {{DATE_PAID}}</div>
        </div>
        <div style="font-style: italic; font-size: 11px; color: #0f172a;">
          Note: A mark, erasure or alteration of any entry invalidates this certification.
        </div>
      </div>

      <!-- Right: MCR Officer Signatory -->
      <div style="text-align: center; min-width: 220px; margin-top: 32px;">
        <div style="border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; margin-bottom: 4px; font-weight: bold; font-size: 13px; text-transform: uppercase;">
          {{MCR_OFFICER_NAME}}
        </div>
        <div style="font-size: 12px; color: #1e293b; font-weight: 500;">
          {{MCR_OFFICER_TITLE}}
        </div>
      </div>
    </div>
  `;

  // Payment Particulars & Security QR Footer HTML (Exact 1:1 match to specimen image)
  const paymentAndQrFooterSnippet = `
    <!-- Payment Particulars & Security QR Verification (Specimen-Accurate Layout) -->
    <table style="width: 100%; margin-top: 20px; border: none; font-family: Arial, sans-serif; font-size: 12px;" data-payment-qr-footer="true">
      <tbody>
        <tr>
          <td style="vertical-align: top; width: 62%; border: none; padding: 0;">
            <table style="border: none; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.6;">
              <tbody>
                <tr>
                  <td style="border: none; padding: 1px 6px 1px 0; font-weight: 500;">Amount Paid</td>
                  <td style="border: none; padding: 1px 4px;">:</td>
                  <td style="border: none; padding: 1px 0;">&#8369; {{AMOUNT_PAID}}</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 1px 6px 1px 0; font-weight: 500;">O.R. Number</td>
                  <td style="border: none; padding: 1px 4px;">:</td>
                  <td style="border: none; padding: 1px 0;">{{OR_NUMBER}}</td>
                </tr>
                <tr>
                  <td style="border: none; padding: 1px 6px 1px 0; font-weight: 500;">Date Paid</td>
                  <td style="border: none; padding: 1px 4px;">:</td>
                  <td style="border: none; padding: 1px 0;">{{DATE_PAID}}</td>
                </tr>
              </tbody>
            </table>
            <div style="margin-top: 12px; font-size: 11px; font-style: italic; color: #1e293b;">
              Note: A mark, erasure or alteration of any entry invalidates this certification.
            </div>
          </td>
          <td style="vertical-align: top; width: 38%; text-align: right; border: none; padding: 0;">
            <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center;" data-qr-box="true">
              <span style="display: inline-block; border: 1px solid #cbd5e1; padding: 4px; background: #ffffff; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" data-qr="true">
                ${generateQrSvgString('CERT-2026-0046', 64)}
              </span>
              <div style="margin-top: 6px; font-family: monospace; font-size: 10px; font-weight: bold; color: #1e293b; text-align: center;" data-token="{{VERIFICATION_CODE}}">
                {{VERIFICATION_CODE}}
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  `;

  // Default Philippine Civil Registry Certificate HTML generator
  const generateInitialHtml = (): string => {
    if (template.freeformHtml && template.freeformHtml.trim().length > 0) {
      return template.freeformHtml;
    }

    const formTitle =
      template.formType === 'LCR_FORM_1'
        ? 'CERTIFICATE OF BIRTH'
        : template.formType === 'LCR_FORM_2'
        ? 'CERTIFICATE OF DEATH'
        : 'CERTIFICATE OF MARRIAGE';

    const formCode =
      template.formType === 'LCR_FORM_1'
        ? `LCR FORM NO. 1${template.formLetter}`
        : template.formType === 'LCR_FORM_2'
        ? `LCR FORM NO. 2${template.formLetter}`
        : `LCR FORM NO. 3${template.formLetter}`;

    const isForm1A = template.formType === 'LCR_FORM_1' && template.formLetter === 'A';

    const tableContent = isForm1A
      ? form1AParticularsTableHtml
      : `
        <!-- Particulars Table -->
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-family: Arial, sans-serif; font-size: 12px; border: 1px solid #1e293b;">
          <tbody>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #1e293b;">
              <td style="padding: 8px 12px; width: 40%; font-weight: bold; border-right: 1px solid #1e293b;">Registry Number:</td>
              <td style="padding: 8px 12px; font-family: monospace; font-weight: bold;">{{REGISTRY_NUMBER}}</td>
            </tr>
            <tr style="border-bottom: 1px solid #1e293b;">
              <td style="padding: 8px 12px; font-weight: bold; border-right: 1px solid #1e293b;">Book &amp; Page Number:</td>
              <td style="padding: 8px 12px;">Book {{BOOK_NUMBER}}, Page {{PAGE_NUMBER}}</td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #1e293b;">
              <td style="padding: 8px 12px; font-weight: bold; border-right: 1px solid #1e293b;">Date of Registration:</td>
              <td style="padding: 8px 12px;">{{REGISTRY_DATE}}</td>
            </tr>
            <tr style="border-bottom: 1px solid #1e293b;">
              <td style="padding: 8px 12px; font-weight: bold; border-right: 1px solid #1e293b;">Date &amp; Place of Event:</td>
              <td style="padding: 8px 12px;">{{EVENT_DATE}} &bull; {{EVENT_PLACE}}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 8px 12px; font-weight: bold; border-right: 1px solid #1e293b;">Parents / Spouse Particulars:</td>
              <td style="padding: 8px 12px;">{{SPOUSE_PARENT_NAME}}</td>
            </tr>
          </tbody>
        </table>
      `;

    return `
      <div style="font-family: 'Times New Roman', serif; color: #0f172a; line-height: 1.5;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 18px;">
          <p style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Republic of the Philippines</p>
          <p style="margin: 2px 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">Province of {{PROVINCE}}</p>
          <p style="margin: 2px 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">Municipality of {{MUNICIPALITY}}</p>
          <p style="margin: 3px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">OFFICE OF THE MUNICIPAL CIVIL REGISTRAR</p>
          <div style="margin: 8px auto 0 auto; width: 85%; border-bottom: 2px solid #0f172a;"></div>
        </div>

        <!-- Meta Line -->
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 16px; font-family: Arial, sans-serif;">
          <div><strong style="text-decoration: underline;">${formCode}</strong></div>
          <div>Date: <strong>{{DATE_ISSUED}}</strong></div>
        </div>

        <!-- Document Title -->
        <div style="text-align: center; margin: 18px 0 20px 0;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px; text-decoration: underline;">${formTitle}</h2>
        </div>

        <!-- Salutation -->
        <div style="margin-bottom: 12px; font-size: 13px; font-weight: bold; font-family: Arial, sans-serif;">
          TO WHOM IT MAY CONCERN:
        </div>

        <!-- Main Body -->
        <div style="font-size: 13px; text-align: justify; line-height: 1.7; margin-bottom: 16px;">
          <p style="text-indent: 32px; margin: 0 0 12px 0;">
            This is to certify that according to the Civil Registry Records archived in this office, the civil registry records of 
            <strong style="text-decoration: underline;">{{PERSON_NAME}}</strong> are duly registered and recorded under the following particulars:
          </p>
        </div>

        ${tableContent}

        <!-- Request Clause -->
        <div style="font-size: 13px; text-align: justify; line-height: 1.7; margin: 16px 0;">
          <p style="text-indent: 32px; margin: 0;">
            This certification is issued upon the request of <strong>{{REQUESTED_BY}}</strong>.
          </p>
        </div>

        <!-- Signatories & Verification (Specimen-Accurate Layout) -->
        <div style="margin-top: 32px; display: flex; justify-content: space-between; align-items: flex-start; font-family: Arial, sans-serif;">
          <!-- Left: VERIFIED BY -->
          <div style="font-size: 12px; color: #0f172a; line-height: 1.5; min-width: 270px; text-align: left;">
            <div style="font-weight: bold; margin-bottom: 12px; font-size: 12px;">VERIFIED BY:</div>
            <div style="text-align: center; width: 240px; margin-bottom: 16px;">
              <div style="font-weight: bold; font-size: 13px; text-transform: uppercase;">{{VERIFIER_NAME}}</div>
              <div style="font-size: 12px; color: #1e293b; margin-top: 2px;">{{VERIFIER_TITLE}}</div>
            </div>
          </div>

          <!-- Right: MCR Officer Signatory -->
          <div style="text-align: center; min-width: 220px; margin-top: 32px;">
            <div style="border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; margin-bottom: 4px; font-weight: bold; font-size: 13px; text-transform: uppercase;">
              {{MCR_OFFICER_NAME}}
            </div>
            <div style="font-size: 12px; color: #1e293b; font-weight: 500;">
              {{MCR_OFFICER_TITLE}}
            </div>
          </div>
        </div>

        ${paymentAndQrFooterSnippet}
      </div>
    `;
  };

  // Initialize editor content on mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = generateInitialHtml();
      updateCounts();
    }
  }, []);

  // Update element path and word counts (with full hierarchical breadcrumbs matching screenshot 6)
  const updateCounts = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);

    const selection = window.getSelection();
    if (selection && selection.anchorNode) {
      let node: Node | null = selection.anchorNode;
      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
      }
      const tags: string[] = [];
      while (node && node !== editorRef.current && node.nodeType === Node.ELEMENT_NODE) {
        tags.unshift((node as HTMLElement).tagName.toLowerCase());
        node = node.parentNode;
      }
      setElementPath(tags.length > 0 ? tags.join(' > ') : 'p');
    }
  };

  // Helper to find currently focused table cell
  const getSelectedCell = (): HTMLTableCellElement | null => {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return null;
    let node: Node | null = sel.anchorNode;
    while (node && node !== editorRef.current) {
      if (node.nodeName === 'TD' || node.nodeName === 'TH') {
        return node as HTMLTableCellElement;
      }
      node = node.parentNode;
    }
    return null;
  };

  // Table Cell Operations (matching screenshot 8)
  const handleInsertCell = (before: boolean) => {
    const cell = getSelectedCell();
    if (!cell) {
      showNotice('Please click inside a table cell first');
      return;
    }
    const row = cell.parentElement as HTMLTableRowElement;
    const newCell = row.insertCell(before ? cell.cellIndex : cell.cellIndex + 1);
    newCell.style.border = '1px solid #94a3b8';
    newCell.style.padding = '6px 10px';
    newCell.innerHTML = '&nbsp;';
    updateCounts();
    showNotice(`Cell inserted ${before ? 'before' : 'after'}`);
  };

  const handleDeleteCell = () => {
    const cell = getSelectedCell();
    if (!cell) {
      showNotice('Please click inside a table cell first');
      return;
    }
    cell.remove();
    updateCounts();
    showNotice('Cell deleted');
  };

  const handleMergeCells = () => {
    const cell = getSelectedCell();
    if (!cell || !cell.nextElementSibling) {
      showNotice('Select a cell with an adjacent cell to merge');
      return;
    }
    const next = cell.nextElementSibling as HTMLTableCellElement;
    cell.colSpan = (cell.colSpan || 1) + (next.colSpan || 1);
    cell.innerHTML = (cell.innerHTML || '') + ' ' + (next.innerHTML || '');
    next.remove();
    updateCounts();
    showNotice('Cells merged');
  };

  const handleSplitCell = () => {
    const cell = getSelectedCell();
    if (!cell || (cell.colSpan || 1) <= 1) {
      showNotice('Cell is not merged');
      return;
    }
    cell.colSpan = cell.colSpan - 1;
    const row = cell.parentElement as HTMLTableRowElement;
    const newCell = row.insertCell(cell.cellIndex + 1);
    newCell.style.border = '1px solid #94a3b8';
    newCell.style.padding = '6px 10px';
    newCell.innerHTML = '&nbsp;';
    updateCounts();
    showNotice('Cell split');
  };

  // Table Row Operations (matching screenshot 8)
  const handleInsertRow = (before: boolean) => {
    const cell = getSelectedCell();
    if (!cell) {
      showNotice('Please click inside a table cell first');
      return;
    }
    const row = cell.parentElement as HTMLTableRowElement;
    const table = row.closest('table');
    if (!table) return;
    const newRow = table.insertRow(before ? row.rowIndex : row.rowIndex + 1);
    for (let i = 0; i < row.cells.length; i++) {
      const newCell = newRow.insertCell(i);
      newCell.style.border = '1px solid #94a3b8';
      newCell.style.padding = '6px 10px';
      newCell.innerHTML = '&nbsp;';
    }
    updateCounts();
    showNotice(`Row inserted ${before ? 'above' : 'below'}`);
  };

  const handleDeleteRow = () => {
    const cell = getSelectedCell();
    if (!cell) {
      showNotice('Please click inside a table cell first');
      return;
    }
    const row = cell.parentElement as HTMLTableRowElement;
    row.remove();
    updateCounts();
    showNotice('Row deleted');
  };

  const handleCopyRow = () => {
    const cell = getSelectedCell();
    if (!cell) {
      showNotice('Please click inside a table cell first');
      return;
    }
    const row = cell.parentElement as HTMLTableRowElement;
    setCopiedRowHtml(row.outerHTML);
    showNotice('Row copied to clipboard');
  };

  const handleCutRow = () => {
    const cell = getSelectedCell();
    if (!cell) {
      showNotice('Please click inside a table cell first');
      return;
    }
    const row = cell.parentElement as HTMLTableRowElement;
    setCopiedRowHtml(row.outerHTML);
    row.remove();
    updateCounts();
    showNotice('Row cut');
  };

  const handlePasteRow = (before: boolean) => {
    if (!copiedRowHtml) {
      showNotice('No copied row found in clipboard');
      return;
    }
    const cell = getSelectedCell();
    if (!cell) {
      showNotice('Please click inside a table cell first');
      return;
    }
    const row = cell.parentElement as HTMLTableRowElement;
    row.insertAdjacentHTML(before ? 'beforebegin' : 'afterend', copiedRowHtml);
    updateCounts();
    showNotice(`Row pasted ${before ? 'above' : 'below'}`);
  };

  // Table Column Operations (matching screenshot 8)
  const handleInsertCol = (before: boolean) => {
    const cell = getSelectedCell();
    if (!cell) {
      showNotice('Please click inside a table cell first');
      return;
    }
    const colIdx = cell.cellIndex;
    const table = cell.closest('table');
    if (!table) return;
    for (let r = 0; r < table.rows.length; r++) {
      const row = table.rows[r];
      const newCell = row.insertCell(before ? colIdx : colIdx + 1);
      newCell.style.border = '1px solid #94a3b8';
      newCell.style.padding = '6px 10px';
      newCell.innerHTML = '&nbsp;';
    }
    updateCounts();
    showNotice(`Column inserted ${before ? 'left' : 'right'}`);
  };

  const handleDeleteCol = () => {
    const cell = getSelectedCell();
    if (!cell) {
      showNotice('Please click inside a table cell first');
      return;
    }
    const colIdx = cell.cellIndex;
    const table = cell.closest('table');
    if (!table) return;
    for (let r = 0; r < table.rows.length; r++) {
      if (table.rows[r].cells[colIdx]) {
        table.rows[r].deleteCell(colIdx);
      }
    }
    updateCounts();
    showNotice('Column deleted');
  };

  const handleDeleteTable = () => {
    const cell = getSelectedCell();
    if (!cell) {
      showNotice('Please click inside a table first');
      return;
    }
    const table = cell.closest('table');
    table?.remove();
    updateCounts();
    showNotice('Table deleted');
  };

  // Interactive 10x10 Grid table generator (matching screenshot 8)
  const createTable = (cols: number, rows: number) => {
    let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #94a3b8; font-size: 11.5px; font-family: Arial, sans-serif;"><tbody>`;
    for (let r = 0; r < rows; r++) {
      tableHtml += `<tr style="${r === 0 ? 'background-color: #e2edf8; font-weight: bold;' : r % 2 === 1 ? 'background-color: #f8fafc;' : ''}">`;
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td style="border: 1px solid #94a3b8; padding: 6px 10px;">${r === 0 ? `Header ${c + 1}` : `Cell ${r + 1}, ${c + 1}`}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br/></p>`;
    insertHtmlAtCursor(tableHtml);
    setActiveDropdownMenu(null);
    showNotice(`Table (${cols}x${rows}) created`);
  };

  // Native execCommand wrapper (Zero 3rd party dependency)
  const execCmd = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    // eslint-disable-next-line deprecation/deprecation
    document.execCommand(command, false, value);
    updateCounts();
  };

  // Insert custom HTML fragment at current cursor position
  const insertHtmlAtCursor = (html: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editorRef.current.innerHTML += html;
      updateCounts();
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const el = document.createElement('div');
    el.innerHTML = html;
    const frag = document.createDocumentFragment();
    let node: ChildNode | null;
    let lastNode: ChildNode | null = null;
    while ((node = el.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    updateCounts();
  };

  // Insert dynamic placeholder badge
  const handleInsertPlaceholder = (token: string) => {
    if (token === '{{QR_CODE}}') {
      const sampleCode = 'CERT-2026-0046';
      const qrSvg = generateQrSvgString(sampleCode, 64);
      const qrSnippet = `<div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; margin: 4px; vertical-align: middle;" data-qr-box="true"><span style="display: inline-block; border: 1px solid #cbd5e1; padding: 4px; background: #ffffff; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" data-qr="true">${qrSvg}</span><div style="margin-top: 4px; font-family: monospace; font-size: 10px; font-weight: bold; color: #1e293b; text-align: center;" data-token="{{VERIFICATION_CODE}}">{{VERIFICATION_CODE}}</div></div>&nbsp;`;
      insertHtmlAtCursor(qrSnippet);
      setIsPlaceholderMenuOpen(false);
      showNotice('Inserted Verification QR Code & Certificate Number placeholder');
      return;
    }
    const badgeHtml = `<span style="background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; font-weight: bold; font-family: monospace; padding: 2px 5px; border-radius: 4px; font-size: 11px;" data-token="${token}">${token}</span>&nbsp;`;
    insertHtmlAtCursor(badgeHtml);
    setIsPlaceholderMenuOpen(false);
    showNotice(`Inserted placeholder token: ${token}`);
  };

  // Insert Table
  const handleInsertTable = () => {
    let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #334155; font-size: 12px; font-family: Arial, sans-serif;"><tbody>`;
    for (let r = 0; r < tableRows; r++) {
      tableHtml += `<tr style="${r % 2 === 0 ? 'background-color: #f8fafc;' : ''}">`;
      for (let c = 0; c < tableCols; c++) {
        tableHtml += `<td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Cell (${r + 1}, ${c + 1})</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br/></p>`;
    insertHtmlAtCursor(tableHtml);
    setIsTableModalOpen(false);
    showNotice(`Table (${tableRows}x${tableCols}) inserted`);
  };

  // Handle background image upload
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setBackgroundUrl(dataUrl);
      showNotice('Background watermark image updated');
      setIsBackgroundModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // Handle Save Template
  const handleSave = () => {
    const currentHtml = editorRef.current?.innerHTML || '';
    const updated: MunicipalCertificateTemplate = {
      ...template,
      editorMode: 'wysiwyg',
      freeformHtml: currentHtml,
      customBackgroundUrl: backgroundUrl,
      backgroundOpacityPercent: backgroundOpacity,
      lastUpdated: new Date().toISOString(),
    };
    onSave(updated);
    showNotice('Template saved successfully');
  };

  // Open Raw Source Code Modal
  const handleOpenSourceCode = () => {
    setRawHtml(editorRef.current?.innerHTML || '');
    setIsCodeModalOpen(true);
  };

  // Apply Raw Source Code
  const handleApplySourceCode = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = rawHtml;
      updateCounts();
    }
    setIsCodeModalOpen(false);
    showNotice('Source code applied to document');
  };

  // Insert Image URL or uploaded base64
  const handleInsertImage = () => {
    if (!imageUrl.trim()) return;
    const widthStyle = imageWidth.trim() ? `width: ${imageWidth.trim()};` : 'max-height: 90px;';
    const altText = imageAlt.trim() ? imageAlt.trim() : 'Emblem / Graphic';
    insertHtmlAtCursor(
      `<div style="text-align: center; margin: 10px 0;"><img src="${imageUrl.trim()}" style="${widthStyle} display: inline-block; object-fit: contain;" alt="${altText}" /></div>`
    );
    setImageUrl('');
    setImageWidth('');
    setImageAlt('');
    setIsImageModalOpen(false);
    showNotice('Image inserted');
  };

  // Insert Link
  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;
    const text = linkText.trim() || linkUrl.trim();
    insertHtmlAtCursor(
      `<a href="${linkUrl.trim()}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${text}</a>`
    );
    setLinkUrl('');
    setLinkText('');
    setIsLinkModalOpen(false);
    showNotice('Link inserted');
  };

  // Apply Table Properties to current table
  const handleApplyTableProperties = () => {
    const cell = getSelectedCell();
    if (!cell) {
      showNotice('Please click inside the table to modify its properties');
      setIsTablePropsModalOpen(false);
      return;
    }
    const table = cell.closest('table');
    if (table) {
      if (tableWidth) table.style.width = tableWidth;
      if (tableAlignment === 'center') {
        table.style.marginLeft = 'auto';
        table.style.marginRight = 'auto';
      } else if (tableAlignment === 'right') {
        table.style.marginLeft = 'auto';
        table.style.marginRight = '0';
      } else if (tableAlignment === 'left') {
        table.style.marginLeft = '0';
        table.style.marginRight = 'auto';
      }
      table.style.border = `${tableBorderSize}px solid ${tableBorderColor}`;
      table.style.backgroundColor = tableBgColor;
      table.querySelectorAll('td, th').forEach((c) => {
        const cellEl = c as HTMLElement;
        cellEl.style.border = `${tableBorderSize}px solid ${tableBorderColor}`;
        cellEl.style.padding = `${tableCellPadding}px`;
      });
      updateCounts();
      showNotice('Table properties updated');
    }
    setIsTablePropsModalOpen(false);
  };

  // Interactive 10x10 Table Grid Picker (matching screenshot 8)
  const renderTableGridPicker = () => {
    const currentCols = hoverGrid ? hoverGrid.cols : 0;
    const currentRows = hoverGrid ? hoverGrid.rows : 0;

    return (
      <div className="p-2 select-none w-52 bg-white" onMouseLeave={() => setHoverGrid(null)}>
        <div className="text-[11px] font-semibold text-slate-700 mb-2 flex items-center justify-between">
          <span>Insert Table Grid</span>
          <span className="font-mono text-blue-600 font-bold">
            {hoverGrid ? `${hoverGrid.cols}x${hoverGrid.rows}` : '0x0'}
          </span>
        </div>
        <div className="grid grid-cols-10 gap-1 p-1.5 bg-slate-50 border border-slate-200 rounded">
          {Array.from({ length: 10 }).map((_, rIdx) =>
            Array.from({ length: 10 }).map((_, cIdx) => {
              const col = cIdx + 1;
              const row = rIdx + 1;
              const isHighlighted = hoverGrid && col <= currentCols && row <= currentRows;
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  onMouseEnter={() => setHoverGrid({ cols: col, rows: row })}
                  onClick={() => {
                    createTable(col, row);
                    setHoverGrid(null);
                  }}
                  className={`w-3.5 h-3.5 border transition-colors cursor-pointer rounded-2xs ${
                    isHighlighted
                      ? 'bg-blue-500 border-blue-600'
                      : 'bg-white border-slate-300 hover:border-blue-400'
                  }`}
                  title={`${col}x${row}`}
                />
              );
            })
          )}
        </div>
        <div className="mt-2 text-center text-[10px] text-slate-500 font-medium">
          {hoverGrid ? `${hoverGrid.cols} Columns &times; ${hoverGrid.rows} Rows` : 'Hover to choose grid size'}
        </div>
      </div>
    );
  };

  // Temporary notice helper
  const showNotice = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(null);
    }, 3500);
  };

  // Dedicated Print Helper
  const handlePrintDocument = () => {
    if (!editorRef.current) {
      window.print();
      return;
    }

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((s) => s.outerHTML)
      .join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LCR Template Document Preview</title>
  ${styles}
  <style>
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    @page {
      size: 8.5in 13in portrait;
      margin: 0;
    }
    html, body {
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 0;
      font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .print-toolbar {
      max-width: 800px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: white;
      padding: 12px 18px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      font-family: system-ui, -apple-system, sans-serif;
    }
    .print-toolbar-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .print-toolbar-actions {
      display: flex;
      gap: 10px;
    }
    .btn-print {
      background: #2563eb;
      color: white;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-print:hover {
      background: #1d4ed8;
    }
    .btn-close {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .print-sheet {
      max-width: 816px;
      min-height: 1248px;
      margin: 0 auto;
      background: white;
      padding: 0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      position: relative;
    }
    @page {
      size: 8.5in 13in portrait;
      margin: 0;
    }
    @media print {
      body {
        background: transparent !important;
        padding: 0 !important;
        color: black !important;
      }
      .print-toolbar {
        display: none !important;
      }
      .print-sheet {
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        max-width: 100% !important;
        width: 100% !important;
        position: relative !important;
        background: transparent !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar no-print">
    <div class="print-toolbar-title">LCR Template Document Preview (8.5 × 13 PH Legal)</div>
    <div class="print-toolbar-actions">
      <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF (8.5 × 13 PH Legal)</button>
      <button class="btn-close" onclick="window.close()">Close Window</button>
    </div>
  </div>
  <div class="print-sheet">
    ${
      backgroundUrl
        ? `<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; overflow: hidden; z-index: 1;">
            <img src="${backgroundUrl}" alt="Background Seal" style="max-width: 440px; max-height: 440px; object-fit: contain; opacity: ${backgroundOpacity / 100};" />
           </div>`
        : ''
    }
    <div style="position: relative; z-index: 10;">
      ${editorRef.current.innerHTML}
    </div>
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 400);
    });
  <\/script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const win = window.open(blobUrl, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 300);
    }
  };

  return (
    <div className="w-full space-y-3 font-sans" onClick={() => setActiveDropdownMenu(null)}>
      {/* Top Banner (Exact wording and style matching user screenshot) */}
      <div className="w-full bg-blue-50/80 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-center gap-2.5 shadow-2xs">
        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
          <Info className="w-3.5 h-3.5" />
        </div>
        <p className="leading-relaxed">
          <strong className="font-semibold">FOR THE SELECTED/ACTIVE TEMPLATE:</strong> To use the default pre-defined
          template, click the Customize Template button then update the &quot;Status&quot; of the customized template and
          Save.
        </p>
      </div>

      {/* Editor Container */}
      <div className="w-full bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden">
        {/* Menu Bar (File, Edit, View, Insert, Format, Tools, Table) matching screenshots 3, 4, 5, 6, 7, 8 */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 select-none">
          {/* File Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownMenu(activeDropdownMenu === 'file' ? null : 'file');
                setActiveSubmenu(null);
              }}
              className={`px-2 py-1 rounded hover:bg-slate-200 cursor-pointer ${
                activeDropdownMenu === 'file' ? 'bg-slate-200 font-semibold text-slate-900' : ''
              }`}
            >
              File
            </button>
            {activeDropdownMenu === 'file' && (
              <div
                className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (editorRef.current) {
                      editorRef.current.innerHTML = '<p><br/></p>';
                      updateCounts();
                    }
                    setActiveDropdownMenu(null);
                    showNotice('New blank document created');
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-slate-500" /> New Document
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+N</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editorRef.current) {
                      editorRef.current.innerHTML = generateInitialHtml();
                      updateCounts();
                    }
                    setActiveDropdownMenu(null);
                    showNotice('Reset to standard Civil Registry template');
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Standard LCR Template
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editorRef.current) {
                      editorRef.current.innerHTML = businessPermitHtml;
                      updateCounts();
                    }
                    setActiveDropdownMenu(null);
                    showNotice('Loaded Isabela Business Permit Specimen');
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-blue-700 font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-blue-600" /> Isabela Business Permit Specimen
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    handleOpenSourceCode();
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5 text-slate-500" /> View Source HTML
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePrintDocument();
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Printer className="w-3.5 h-3.5 text-slate-500" /> Print Document
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+P</span>
                </button>
              </div>
            )}
          </div>

          {/* Edit Menu (Matching screenshot 3) */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownMenu(activeDropdownMenu === 'edit' ? null : 'edit');
                setActiveSubmenu(null);
              }}
              className={`px-2 py-1 rounded hover:bg-slate-200 cursor-pointer ${
                activeDropdownMenu === 'edit' ? 'bg-slate-200 font-semibold text-slate-900' : ''
              }`}
            >
              Edit
            </button>
            {activeDropdownMenu === 'edit' && (
              <div
                className="absolute top-full left-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    execCmd('undo');
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Undo className="w-3.5 h-3.5 text-slate-500" /> Undo
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+Z</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    execCmd('redo');
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Redo className="w-3.5 h-3.5 text-slate-500" /> Redo
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+Y</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    execCmd('cut');
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Scissors className="w-3.5 h-3.5 text-slate-500" /> Cut
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+X</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    execCmd('copy');
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Copy className="w-3.5 h-3.5 text-slate-500" /> Copy
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.readText().then((clipText) => {
                      insertHtmlAtCursor(clipText);
                    }).catch(() => {
                      execCmd('paste');
                    });
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Clipboard className="w-3.5 h-3.5 text-slate-500" /> Paste
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+V</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    execCmd('selectAll');
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span>Select all</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+A</span>
                </button>
              </div>
            )}
          </div>

          {/* View Menu (Matching screenshot 4) */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownMenu(activeDropdownMenu === 'view' ? null : 'view');
                setActiveSubmenu(null);
              }}
              className={`px-2 py-1 rounded hover:bg-slate-200 cursor-pointer ${
                activeDropdownMenu === 'view' ? 'bg-slate-200 font-semibold text-slate-900' : ''
              }`}
            >
              View
            </button>
            {activeDropdownMenu === 'view' && (
              <div
                className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setVisualAids(!visualAids);
                    showNotice(`Visual aids ${!visualAids ? 'enabled' : 'disabled'}`);
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span>Visual aids</span>
                  {visualAids && <Check className="w-3.5 h-3.5 text-blue-600 font-bold" />}
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    handleOpenSourceCode();
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5 text-slate-500" /> Source code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsBackgroundModalOpen(true);
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-500" /> Background Settings
                </button>
              </div>
            )}
          </div>

          {/* Insert Menu (Matching screenshot 5) */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownMenu(activeDropdownMenu === 'insert' ? null : 'insert');
                setActiveSubmenu(null);
              }}
              className={`px-2 py-1 rounded hover:bg-slate-200 cursor-pointer ${
                activeDropdownMenu === 'insert' ? 'bg-slate-200 font-semibold text-slate-900' : ''
              }`}
            >
              Insert
            </button>
            {activeDropdownMenu === 'insert' && (
              <div
                className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsImageModalOpen(true);
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" /> Insert image...
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLinkModalOpen(true);
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-slate-500" /> Insert link...
                </button>
                <button
                  type="button"
                  onClick={() => {
                    execCmd('insertHorizontalRule');
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5 text-slate-500" /> Horizontal line
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = formatDateDDMMMYYYY(new Date());
                    insertHtmlAtCursor(`<span>${today}</span>`);
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" /> Insert Date
                </button>
                <div className="my-1 border-t border-slate-100" />
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Civil Registry Modules
                </div>
                <button
                  type="button"
                  onClick={() => {
                    insertHtmlAtCursor(form1AParticularsTableHtml);
                    setActiveDropdownMenu(null);
                    showNotice('Form 1A particulars table inserted');
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-emerald-50 text-emerald-800 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <TableIcon className="w-3.5 h-3.5 text-emerald-600" /> Form 1A Table (13 Fields)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    insertHtmlAtCursor(dualSignatoryHtmlSnippet);
                    setActiveDropdownMenu(null);
                    showNotice('Verifier & MCR Signatories inserted');
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-blue-800 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-blue-600" /> Verifier &amp; MCR Signatories
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sampleCode = 'CERT-2026-0046';
                    const qrSvg = generateQrSvgString(sampleCode, 64);
                    const qrSnippet = `
                      <!-- Official CRIS Document QR Verification Block -->
                      <div class="lcr-qr-verification-block" style="margin: 20px 0 10px 0; padding-top: 10px; border-top: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: space-between; font-family: Arial, sans-serif;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                          <div style="border: 1px solid #94a3b8; padding: 2px; background: #ffffff; border-radius: 4px; display: inline-block;">
                            ${qrSvg}
                          </div>
                          <div style="text-align: left; line-height: 1.4;">
                            <div style="font-size: 10px; font-weight: bold; font-family: monospace; color: #0f172a;">CERTIFICATE NO: {{CERT_NUMBER}}</div>
                            <div style="font-size: 9px; color: #64748b;">Republic Act No. 3753 &bull; Civil Registry Law</div>
                            <div style="font-size: 9px; color: #059669; font-weight: bold;">&#10003; Scan QR to Authenticate against Official Database</div>
                          </div>
                        </div>
                        <div style="text-align: right; font-size: 9px; font-family: monospace; color: #475569;">
                          <div>OFFICIAL RECORD</div>
                          <div style="font-weight: bold;">PAGE 1 OF 1</div>
                        </div>
                      </div>
                    `;
                    insertHtmlAtCursor(qrSnippet);
                    setActiveDropdownMenu(null);
                    showNotice('Official Verification QR Code block inserted');
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-emerald-50 text-emerald-800 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Verification QR Code Block
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleInsertPlaceholder('{{QR_CODE}}');
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-purple-50 text-purple-800 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-purple-600" /> Standalone QR Code (&#123;&#123;QR_CODE&#125;&#125;)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaceholderMenuOpen(true);
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" /> Registry Placeholder Token...
                </button>
              </div>
            )}
          </div>

          {/* Format Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownMenu(activeDropdownMenu === 'format' ? null : 'format');
                setActiveSubmenu(null);
              }}
              className={`px-2 py-1 rounded hover:bg-slate-200 cursor-pointer ${
                activeDropdownMenu === 'format' ? 'bg-slate-200 font-semibold text-slate-900' : ''
              }`}
            >
              Format
            </button>
            {activeDropdownMenu === 'format' && (
              <div
                className="absolute top-full left-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    execCmd('bold');
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 font-bold text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Bold className="w-3.5 h-3.5" /> Bold
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+B</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    execCmd('italic');
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 italic text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Italic className="w-3.5 h-3.5" /> Italic
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+I</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    execCmd('underline');
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 underline text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Underline className="w-3.5 h-3.5" /> Underline
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+U</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    execCmd('strikeThrough');
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 line-through text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Strikethrough className="w-3.5 h-3.5" /> Strikethrough
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    execCmd('removeFormat');
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                >
                  Clear Formatting
                </button>
              </div>
            )}
          </div>

          {/* Tools Menu (Matching screenshots 6 & 7) */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownMenu(activeDropdownMenu === 'tools' ? null : 'tools');
                setActiveSubmenu(null);
              }}
              className={`px-2 py-1 rounded hover:bg-slate-200 cursor-pointer ${
                activeDropdownMenu === 'tools' ? 'bg-slate-200 font-semibold text-slate-900' : ''
              }`}
            >
              Tools
            </button>
            {activeDropdownMenu === 'tools' && (
              <div
                className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleOpenSourceCode();
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5 text-slate-500" /> Source code
                </button>
                <div className="px-3 py-1.5 text-slate-600 border-t border-slate-100 flex items-center justify-between">
                  <span>Word count</span>
                  <span className="font-mono text-slate-800 font-bold">{wordCount}</span>
                </div>
              </div>
            )}
          </div>

          {/* Table Menu (Matching screenshot 8 with Table, Cell, Row, Column submenus) */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownMenu(activeDropdownMenu === 'table' ? null : 'table');
                setActiveSubmenu(null);
              }}
              className={`px-2 py-1 rounded hover:bg-slate-200 cursor-pointer ${
                activeDropdownMenu === 'table' ? 'bg-slate-200 font-semibold text-slate-900' : ''
              }`}
            >
              Table
            </button>
            {activeDropdownMenu === 'table' && (
              <div
                className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Table -> 10x10 Grid Picker */}
                <div
                  className="relative group"
                  onMouseEnter={() => setActiveSubmenu('table-grid')}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSubmenu(activeSubmenu === 'table-grid' ? null : 'table-grid')}
                    className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center justify-between cursor-pointer"
                  >
                    <span>Table</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  {activeSubmenu === 'table-grid' && (
                    <div
                      className="absolute top-0 left-full ml-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderTableGridPicker()}
                    </div>
                  )}
                </div>

                {/* Cell Submenu */}
                <div
                  className="relative group"
                  onMouseEnter={() => setActiveSubmenu('cell')}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSubmenu(activeSubmenu === 'cell' ? null : 'cell')}
                    className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center justify-between cursor-pointer"
                  >
                    <span>Cell</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  {activeSubmenu === 'cell' && (
                    <div
                      className="absolute top-0 left-full ml-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          showNotice('Cell properties (padding, alignment active)');
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                      >
                        Cell properties
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleMergeCells();
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                      >
                        Merge cells
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSplitCell();
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                      >
                        Split cell
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={() => {
                          handleInsertCell(true);
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                      >
                        Insert cell before
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleInsertCell(false);
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                      >
                        Insert cell after
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteCell();
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-700 cursor-pointer"
                      >
                        Delete cell
                      </button>
                    </div>
                  )}
                </div>

                {/* Row Submenu */}
                <div
                  className="relative group"
                  onMouseEnter={() => setActiveSubmenu('row')}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSubmenu(activeSubmenu === 'row' ? null : 'row')}
                    className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center justify-between cursor-pointer"
                  >
                    <span>Row</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  {activeSubmenu === 'row' && (
                    <div
                      className="absolute top-0 left-full ml-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          showNotice('Row properties applied');
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                      >
                        Row properties
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={() => {
                          handleInsertRow(true);
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                      >
                        Insert row above
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleInsertRow(false);
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                      >
                        Insert row below
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteRow();
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-700 cursor-pointer"
                      >
                        Delete row
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={() => {
                          handleCutRow();
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                      >
                        Cut row
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleCopyRow();
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                      >
                        Copy row
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handlePasteRow(true);
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                      >
                        Paste row above
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handlePasteRow(false);
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                      >
                        Paste row below
                      </button>
                    </div>
                  )}
                </div>

                {/* Column Submenu */}
                <div
                  className="relative group"
                  onMouseEnter={() => setActiveSubmenu('col')}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSubmenu(activeSubmenu === 'col' ? null : 'col')}
                    className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 flex items-center justify-between cursor-pointer"
                  >
                    <span>Column</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  {activeSubmenu === 'col' && (
                    <div
                      className="absolute top-0 left-full ml-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          handleInsertCol(true);
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                      >
                        Insert column left
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleInsertCol(false);
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                      >
                        Insert column right
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteCol();
                          setActiveDropdownMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-700 cursor-pointer"
                      >
                        Delete column
                      </button>
                    </div>
                  )}
                </div>

                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    setIsTablePropsModalOpen(true);
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-slate-700 cursor-pointer"
                >
                  Table properties
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteTable();
                    setActiveDropdownMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-700 cursor-pointer"
                >
                  Delete table
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Toolbar (Matching user screenshots with Formats, Font, Size, Styles, Colors, Alignments, Table Grid Popover, Visual Aids) */}
        <div className="flex flex-wrap items-center gap-1 p-2 bg-white border-b border-slate-200 text-slate-700">
          {/* Undo / Redo */}
          <button
            type="button"
            onClick={() => execCmd('undo')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('redo')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* Formats Dropdown */}
          <select
            aria-label="Format Block"
            onChange={(e) => {
              if (e.target.value) {
                execCmd('formatBlock', e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-700 hover:border-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            title="Formats"
          >
            <option value="" disabled>Formats</option>
            <option value="<p>">Paragraph</option>
            <option value="<h1>">Heading 1</option>
            <option value="<h2>">Heading 2</option>
            <option value="<h3>">Heading 3</option>
            <option value="<h4>">Heading 4</option>
            <option value="<pre>">Preformatted</option>
          </select>

          {/* Font Family Dropdown */}
          <select
            aria-label="Font Family"
            onChange={(e) => {
              if (e.target.value) {
                execCmd('fontName', e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-700 hover:border-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            title="Font Family"
          >
            <option value="" disabled>Font</option>
            <option value="Arial">Arial</option>
            <option value="'Times New Roman'">Times New Roman</option>
            <option value="'Courier New'">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
            <option value="Tahoma">Tahoma</option>
          </select>

          {/* Font Size Dropdown */}
          <select
            aria-label="Font Size"
            onChange={(e) => {
              if (e.target.value) {
                execCmd('fontSize', e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-700 hover:border-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            title="Font Size"
          >
            <option value="" disabled>Size</option>
            <option value="1">8pt</option>
            <option value="2">10pt</option>
            <option value="3">12pt (Normal)</option>
            <option value="4">14pt</option>
            <option value="5">18pt (Large)</option>
            <option value="6">24pt (X-Large)</option>
            <option value="7">36pt (Title)</option>
          </select>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* Bold, Italic, Underline, Strikethrough */}
          <button
            type="button"
            onClick={() => execCmd('bold')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-800 font-bold transition cursor-pointer"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('italic')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-800 transition cursor-pointer"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('underline')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-800 transition cursor-pointer"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('strikeThrough')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-800 transition cursor-pointer"
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* Color Pickers */}
          <label
            className="flex items-center gap-1 p-1 hover:bg-slate-100 rounded cursor-pointer"
            title="Text Color"
          >
            <Palette className="w-3.5 h-3.5 text-slate-700" />
            <input
              type="color"
              defaultValue="#000000"
              onChange={(e) => execCmd('foreColor', e.target.value)}
              className="w-4 h-4 p-0 border-0 rounded cursor-pointer opacity-80 hover:opacity-100"
            />
          </label>
          <label
            className="flex items-center gap-1 p-1 hover:bg-slate-100 rounded cursor-pointer"
            title="Background / Highlight Color"
          >
            <span className="text-[10px] font-bold px-1 bg-amber-200 rounded text-amber-900">HL</span>
            <input
              type="color"
              defaultValue="#ffff00"
              onChange={(e) => execCmd('hiliteColor', e.target.value)}
              className="w-4 h-4 p-0 border-0 rounded cursor-pointer opacity-80 hover:opacity-100"
            />
          </label>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* Alignments */}
          <button
            type="button"
            onClick={() => execCmd('justifyLeft')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('justifyCenter')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('justifyRight')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('justifyFull')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* Lists & Indentation */}
          <button
            type="button"
            onClick={() => execCmd('insertUnorderedList')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
            title="Bulleted List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('insertOrderedList')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('outdent')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
            title="Decrease Indent"
          >
            <Outdent className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execCmd('indent')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
            title="Increase Indent"
          >
            <Indent className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* Insert Link & Image Modals */}
          <button
            type="button"
            onClick={() => setIsLinkModalOpen(true)}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
            title="Insert / Edit Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsImageModalOpen(true)}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
            title="Insert / Upload Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Table Grid Popover Trigger (10x10 Grid Picker) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setActiveDropdownMenu(activeDropdownMenu === 'toolbar-table-grid' ? null : 'toolbar-table-grid');
              }}
              className={`p-1.5 rounded transition cursor-pointer ${
                activeDropdownMenu === 'toolbar-table-grid' ? 'bg-blue-100 text-blue-800' : 'hover:bg-slate-100 text-slate-700'
              }`}
              title="Insert Table (Interactive 10x10 Grid Picker)"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            {activeDropdownMenu === 'toolbar-table-grid' && (
              <div
                className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2.5 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {renderTableGridPicker()}
                <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTableModalOpen(true);
                      setActiveDropdownMenu(null);
                    }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    More options...
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDropdownMenu(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Horizontal Rule */}
          <button
            type="button"
            onClick={() => execCmd('insertHorizontalRule')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
            title="Horizontal Line"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Superscript, Subscript, Code */}
          <button
            type="button"
            onClick={() => execCmd('superscript')}
            className="px-1.5 py-1 hover:bg-slate-100 rounded text-xs font-serif transition cursor-pointer"
            title="Superscript (x²)"
          >
            x<sup className="text-[9px]">2</sup>
          </button>
          <button
            type="button"
            onClick={() => execCmd('subscript')}
            className="px-1.5 py-1 hover:bg-slate-100 rounded text-xs font-serif transition cursor-pointer"
            title="Subscript (x₂)"
          >
            x<sub className="text-[9px]">2</sub>
          </button>
          <button
            type="button"
            onClick={() => execCmd('removeFormat')}
            className="px-1.5 py-1 hover:bg-slate-100 rounded text-xs font-bold font-serif transition cursor-pointer"
            title="Clear Formatting (Tx)"
          >
            T<span className="text-[10px]">x</span>
          </button>
          <button
            type="button"
            onClick={handleOpenSourceCode}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
            title="View HTML Source (< >)"
          >
            <Code className="w-4 h-4" />
          </button>

          {/* Visual Aids Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setVisualAids(!visualAids);
              showNotice(`Visual aids ${!visualAids ? 'enabled' : 'disabled'}`);
            }}
            className={`px-2 py-1 rounded text-xs font-medium border transition cursor-pointer flex items-center gap-1 ${
              visualAids
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
            title="Toggle Visual Aids (dashed lines for borderless tables and blocks)"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Visual Aids</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* Special Buttons Matching User Screenshot: "Upload Background" & "Upload Placeholder" */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Upload Background Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => backgroundInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-700 transition shadow-2xs cursor-pointer"
                title="Upload municipal seal or watermark background"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload Background</span>
              </button>
              <input
                ref={backgroundInputRef}
                type="file"
                accept="image/*"
                onChange={handleBackgroundUpload}
                className="hidden"
              />
            </div>

            {/* Upload / Insert Placeholder Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPlaceholderMenuOpen(!isPlaceholderMenuOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-700 transition shadow-2xs cursor-pointer"
                title="Insert Civil Registry Placeholders"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Upload Placeholder</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Placeholder Tokens Dropdown */}
              {isPlaceholderMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-84 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="font-bold text-slate-800">Civil Registry Tokens</span>
                    <button
                      type="button"
                      onClick={() => setIsPlaceholderMenuOpen(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Form 1A Quick Table Insert Action */}
                  <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-emerald-900 text-[11px]">LCR Form 1A (Birth) Table</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-200 text-emerald-900 font-bold rounded">13 Fields</span>
                    </div>
                    <p className="text-[10px] text-emerald-700 mb-1.5 leading-tight">
                      Inserts complete 13-field table with Registry No, Child, Parents, Citizenship, Marriage &amp; Remarks.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        insertHtmlAtCursor(form1AParticularsTableHtml);
                        setIsPlaceholderMenuOpen(false);
                        showNotice('Form 1A particulars table inserted');
                      }}
                      className="w-full py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] transition cursor-pointer"
                    >
                      + Insert Form 1A Table (13 Fields)
                    </button>
                  </div>

                  {/* Verifier & MCR Signatories Quick Action */}
                  <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-blue-900 text-[11px]">Verifier &amp; MCR Signatories</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-blue-200 text-blue-900 font-bold rounded">Dual</span>
                    </div>
                    <p className="text-[10px] text-blue-700 mb-1.5 leading-tight">
                      Inserts &quot;Verified by&quot; and &quot;Approved by&quot; signature blocks side-by-side.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        insertHtmlAtCursor(dualSignatoryHtmlSnippet);
                        setIsPlaceholderMenuOpen(false);
                        showNotice('Verifier & MCR Signatories inserted');
                      }}
                      className="w-full py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[11px] transition cursor-pointer"
                    >
                      + Insert Verifier &amp; MCR Signatories
                    </button>
                  </div>

                  {/* Payment Particulars & Security QR Quick Action (Specimen Match) */}
                  <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-purple-900 text-[11px]">Payment &amp; Security QR Footer</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-purple-200 text-purple-900 font-bold rounded">Specimen</span>
                    </div>
                    <p className="text-[10px] text-purple-700 mb-1.5 leading-tight">
                      Inserts Amount Paid, O.R. Number, Date Paid, Caution Note &amp; Security QR with Certificate Number.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        insertHtmlAtCursor(paymentAndQrFooterSnippet);
                        setIsPlaceholderMenuOpen(false);
                        showNotice('Payment & Security QR Footer inserted');
                      }}
                      className="w-full py-1 px-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded text-[11px] transition cursor-pointer"
                    >
                      + Insert Payment &amp; Security QR Block
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 mb-2">
                    Click any token below to insert it at cursor:
                  </p>
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                    {CERTIFICATE_PLACEHOLDERS.map((ph: PlaceholderDefinition) => (
                      <button
                        key={ph.token}
                        type="button"
                        onClick={() => handleInsertPlaceholder(ph.token)}
                        className="w-full text-left p-1.5 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200 transition flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-blue-700 font-bold text-[11px]">{ph.token}</span>
                            {ph.category === 'Form 1A Particulars' && (
                              <span className="text-[9px] px-1 bg-emerald-100 text-emerald-800 font-bold rounded">1A</span>
                            )}
                            {ph.token === '{{QR_CODE}}' && (
                              <span className="text-[9px] px-1 bg-purple-100 text-purple-800 font-bold rounded">QR IMAGE</span>
                            )}
                            {ph.token === '{{VERIFICATION_CODE}}' && (
                              <span className="text-[9px] px-1 bg-blue-100 text-blue-800 font-bold rounded">SECURITY HASH</span>
                            )}
                          </div>
                          <span className="block text-[10px] text-slate-500">{ph.label}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition">
                          Insert +
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document Editor Paper Sheet Canvas */}
        <div className="bg-slate-200/70 p-6 min-h-[700px] flex justify-center items-start overflow-x-auto">
          <div
            className="w-full max-w-[816px] min-h-[1248px] bg-white border border-slate-300 shadow-md p-0 m-0 relative outline-none transition-all"
            style={{
              backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundSize: '400px',
            }}
          >
            {/* Watermark Overlay for Opacity if background image is set */}
            {backgroundUrl && (
              <div
                className="absolute inset-0 pointer-events-none rounded"
                style={{
                  backgroundColor: `rgba(255, 255, 255, ${1 - backgroundOpacity / 100})`,
                }}
              />
            )}

            {/* Editable Content with Visual Aids styling support */}
            <style>{`
              .wysiwyg-editor-canvas table, .visual-aids-active table {
                box-sizing: border-box;
                max-width: 100%;
              }
              ${
                visualAids
                  ? `
                .visual-aids-active table {
                  outline: 1px dashed #94a3b8 !important;
                }
                .visual-aids-active td, .visual-aids-active th {
                  outline: 1px dashed #cbd5e1 !important;
                  min-height: 18px;
                }
              `
                  : ''
              }
            `}</style>
            <div
              ref={editorRef}
              contentEditable={true}
              suppressContentEditableWarning={true}
              onKeyUp={updateCounts}
              onMouseUp={updateCounts}
              className={`wysiwyg-editor-canvas relative z-10 min-h-[1248px] outline-none text-slate-900 leading-normal p-0 m-0 ${
                visualAids ? 'visual-aids-active' : ''
              }`}
            />
          </div>
        </div>

        {/* Bottom Status Bar (Matching user screenshot: "p" on left, "Build with..." status on right) */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-700">{elementPath}</span>
            <span className="text-slate-300">|</span>
            <span>Words: {wordCount}</span>
            {statusMessage && (
              <span className="text-emerald-600 font-semibold flex items-center gap-1 animate-pulse">
                <Check className="w-3 h-3" /> {statusMessage}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Powered by Native CRIS Editor</span>
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Zero 3rd-Party Free Mode
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar (Matching screenshot: "Back" & "Create" / Save) */}
      <div className="flex items-center justify-center gap-3 pt-2 pb-6">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 bg-black hover:bg-slate-800 text-white rounded-md text-xs font-bold transition shadow-xs cursor-pointer"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-6 py-2 bg-black hover:bg-slate-800 text-white rounded-md text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Create / Save</span>
        </button>
      </div>

      {/* MODAL 1: Insert Table Grid Dialog */}
      {isTableModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-blue-600" /> Insert Table
              </h3>
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rows:</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Columns:</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableCols}
                  onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertTable}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Insert Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Source Code (< >) Inspector */}
      {isCodeModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-600" /> Document HTML Source Code
              </h3>
              <button
                type="button"
                onClick={() => setIsCodeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              rows={16}
              value={rawHtml}
              onChange={(e) => setRawHtml(e.target.value)}
              className="w-full p-3 font-mono text-xs bg-slate-900 text-emerald-400 rounded-lg border border-slate-700"
            />
            <div className="mt-4 flex justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIsCodeModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplySourceCode}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Apply HTML Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Background Watermark Settings */}
      {isBackgroundModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" /> Background Watermark
              </h3>
              <button
                type="button"
                onClick={() => setIsBackgroundModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Watermark Opacity: {backgroundOpacity}%
                </label>
                <input
                  type="range"
                  min={2}
                  max={50}
                  value={backgroundOpacity}
                  onChange={(e) => setBackgroundOpacity(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {backgroundUrl && (
                <div className="p-2 border border-slate-200 rounded-lg text-center">
                  <span className="block text-[11px] text-slate-500 mb-1">Current Preview:</span>
                  <img
                    src={backgroundUrl}
                    alt="Background preview"
                    className="max-h-24 mx-auto rounded border border-slate-100"
                    style={{ opacity: backgroundOpacity / 100 }}
                  />
                  <button
                    type="button"
                    onClick={() => setBackgroundUrl('')}
                    className="mt-2 text-rose-600 hover:text-rose-700 text-[11px] font-semibold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Remove Background
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIsBackgroundModalOpen(false)}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Insert / Edit Link Dialog */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-blue-600" /> Insert Link
              </h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">URL:</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Text to display (optional):</label>
                <input
                  type="text"
                  placeholder="Link label"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                disabled={!linkUrl.trim()}
                className="px-4 py-1.5 bg-blue-600 disabled:bg-slate-300 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Insert Image Dialog */}
      {isImageModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" /> Insert Image
              </h3>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Image Source URL:</label>
                <input
                  type="url"
                  placeholder="https://... or data:image/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Or Upload from Device:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result as string;
                        setImageUrl(result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Width (optional):</label>
                  <input
                    type="text"
                    placeholder="e.g. 120px or 100%"
                    value={imageWidth}
                    onChange={(e) => setImageWidth(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alt Text (optional):</label>
                  <input
                    type="text"
                    placeholder="e.g. Seal / Emblem"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
              {imageUrl && (
                <div className="mt-2 p-2 border border-slate-200 rounded-lg text-center bg-slate-50">
                  <span className="block text-[10px] text-slate-400 mb-1">Image Preview</span>
                  <img
                    src={imageUrl}
                    alt={imageAlt || 'Preview'}
                    className="max-h-24 mx-auto object-contain rounded border border-slate-200 bg-white"
                  />
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertImage}
                disabled={!imageUrl.trim()}
                className="px-4 py-1.5 bg-blue-600 disabled:bg-slate-300 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Insert Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Table Properties Dialog (Matching screenshot 8) */}
      {isTablePropsModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" /> Table Properties
              </h3>
              <button
                type="button"
                onClick={() => setIsTablePropsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Width:</label>
                  <input
                    type="text"
                    placeholder="100% or 600px"
                    value={tableWidth}
                    onChange={(e) => setTableWidth(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alignment:</label>
                  <select
                    value={tableAlignment}
                    onChange={(e) => setTableAlignment(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="none">None</option>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cell Padding (px):</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={tableCellPadding}
                    onChange={(e) => setTableCellPadding(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cell Spacing (px):</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={tableCellSpacing}
                    onChange={(e) => setTableCellSpacing(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Border Size (px):</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={tableBorderSize}
                    onChange={(e) => setTableBorderSize(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Border Color:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tableBorderColor.startsWith('#') ? tableBorderColor : '#000000'}
                      onChange={(e) => setTableBorderColor(e.target.value)}
                      className="w-7 h-7 p-0 border border-slate-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={tableBorderColor}
                      onChange={(e) => setTableBorderColor(e.target.value)}
                      className="flex-1 px-2 py-1 border border-slate-300 rounded-lg font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Background Color:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tableBgColor.startsWith('#') ? tableBgColor : '#ffffff'}
                    onChange={(e) => setTableBgColor(e.target.value)}
                    className="w-7 h-7 p-0 border border-slate-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={tableBgColor}
                    onChange={(e) => setTableBgColor(e.target.value)}
                    className="flex-1 px-2 py-1 border border-slate-300 rounded-lg font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIsTablePropsModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyTableProperties}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Save Properties
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  LcrFormType,
  LcrFormLetter,
  AnyRegistryRecord,
  BirthRecord,
  MarriageRecord,
  DeathRecord,
  IssuedCertification,
  SiteSettings,
  UserAccount,
} from '../types';
import { storageService } from '../services/storage';
import { replacePlaceholders } from '../services/templates';
import { formatDateDDMMMYYYY } from '../utils/dateUtils';
import {
  Award,
  X,
  Printer,
  CheckCircle2,
  FileText,
  Building2,
  QrCode,
  ShieldCheck,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { QrCodeSvg, generateQrSvgString } from './PublicVerificationView';

interface CertificationModalProps {
  isOpen: boolean;
  selectedRecord?: AnyRegistryRecord | null;
  currentUser: UserAccount;
  siteSettings: SiteSettings;
  onClose: () => void;
  onSaveCert: (cert: IssuedCertification) => void;
  onOpenDesigner?: (formType: LcrFormType, formLetter: LcrFormLetter) => void;
}

export const CertificationModal: React.FC<CertificationModalProps> = ({
  isOpen,
  selectedRecord,
  currentUser,
  siteSettings,
  onClose,
  onSaveCert,
  onOpenDesigner,
}) => {
  const [formType, setFormType] = useState<LcrFormType>('LCR_FORM_1');
  const [formLetter, setFormLetter] = useState<LcrFormLetter>('A');
  const [previewMode, setPreviewMode] = useState(false);

  // Form Fields
  const [personName, setPersonName] = useState('');
  const [spouseOrParentName, setSpouseOrParentName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventPlace, setEventPlace] = useState('');
  const [bookNumber, setBookNumber] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [registryNumber, setRegistryNumber] = useState('');
  const [registryDate, setRegistryDate] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [purpose, setPurpose] = useState('LEGAL AND IDENTIFICATION PURPOSES');
  const [orNumber, setOrNumber] = useState('');
  const [amountPaid, setAmountPaid] = useState('150.00');
  const [dateIssued, setDateIssued] = useState('');
  const [reasonOrDetails, setReasonOrDetails] = useState('');

  // Verifier MCR Staff Selection
  const defaultStaff = useMemo(() => {
    const list = siteSettings.mcrStaff || [];
    const def = list.find((s) => s.isDefault);
    if (def) return def;
    if (list.length > 0) return list[0];
    return {
      id: 'staff-igmedio',
      name: 'IGMEDIO JR. S. TABON',
      title: 'RCO - II',
      isDefault: true,
    };
  }, [siteSettings]);

  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [verifierName, setVerifierName] = useState<string>('');
  const [verifierTitle, setVerifierTitle] = useState<string>('');
  const [includeVerifier, setIncludeVerifier] = useState<boolean>(true);
  const [includeQrCode, setIncludeQrCode] = useState<boolean>(true);
  const [certNumber, setCertNumber] = useState<string>('');
  const [isCustomCertNumber, setIsCustomCertNumber] = useState<boolean>(false);

  const formatLcrCertNumber = (
    orNum: string,
    fType: LcrFormType,
    fLetter: LcrFormLetter,
    dateStr?: string
  ): string => {
    const yr = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
    const cleanOr = (orNum || '').trim().replace(/^OR-?/i, '').replace(/[^a-zA-Z0-9]/g, '') || '4463123';
    const formNum = fType ? fType.replace('LCR_FORM_', '') : '1';
    const cleanLetter = (fLetter || 'A').toUpperCase();
    return `CUL-${yr}-${cleanOr}-${formNum}${cleanLetter}`;
  };

  const handleStaffChange = (staffId: string) => {
    setSelectedStaffId(staffId);
    if (staffId === 'none') {
      setVerifierName('');
      setVerifierTitle('');
      setIncludeVerifier(false);
    } else if (staffId === 'custom') {
      setIncludeVerifier(true);
    } else {
      setIncludeVerifier(true);
      const staff = siteSettings.mcrStaff?.find((s) => s.id === staffId);
      if (staff) {
        setVerifierName(staff.name);
        setVerifierTitle(staff.title);
      } else if (staffId === 'assistant-mcr' && siteSettings.assistantMcrName) {
        setVerifierName(siteSettings.assistantMcrName);
        setVerifierTitle(siteSettings.assistantMcrTitle || 'Assistant MCR');
      }
    }
  };

  // Form 1A Specific Fields (13 Standard Particulars)
  const [sex, setSex] = useState<'MALE' | 'FEMALE' | string>('MALE');
  const [motherName, setMotherName] = useState('');
  const [motherCitizenship, setMotherCitizenship] = useState('FILIPINO');
  const [fatherName, setFatherName] = useState('');
  const [fatherCitizenship, setFatherCitizenship] = useState('FILIPINO');
  const [dateOfMarriage, setDateOfMarriage] = useState('');
  const [placeOfMarriage, setPlaceOfMarriage] = useState('');

  const customTemplate = useMemo(() => {
    return storageService.getCertificateTemplate(formType, formLetter);
  }, [formType, formLetter, previewMode]);

  const toUpper = (s: string) => s.toUpperCase();

  useEffect(() => {
    if (!isOpen) return;

    const todayStr = new Date().toISOString().split('T')[0];
    setDateIssued(todayStr);

    const initialOr = (selectedRecord as any)?.orNumber
      ? String((selectedRecord as any).orNumber).replace(/^OR-?/i, '')
      : String(Math.floor(4000000 + Math.random() * 5000000));
    setOrNumber(initialOr);
    setAmountPaid(siteSettings.defaultOrFee || '150.00');

    // Default certificate number format: CUL-year-ornumber-1x (ex. CUL-2026-4463123-1A)
    const initialFormType: LcrFormType = selectedRecord?.category === 'deaths'
      ? 'LCR_FORM_2'
      : selectedRecord?.category === 'marriages'
      ? 'LCR_FORM_3'
      : 'LCR_FORM_1';
    setCertNumber(formatLcrCertNumber(initialOr, initialFormType, 'A', todayStr));
    setIsCustomCertNumber(false);

    if (selectedRecord) {
      // Pre-fill from record
      setBookNumber(selectedRecord.bookNumber || '');
      setPageNumber(selectedRecord.pageNumber || '');
      setRegistryNumber(selectedRecord.registryNumber || '');
      setRegistryDate(selectedRecord.registryDate || (selectedRecord as any).dateOfRegistration || '');
      setFormLetter('A'); // Default available when clicking from record

      if (selectedRecord.category === 'births') {
        const b = selectedRecord as BirthRecord;
        setFormType('LCR_FORM_1');
        setPersonName(b.name);
        setSex(b.sex || 'MALE');
        setMotherName(b.motherMaidenName || '');
        setMotherCitizenship(b.nationalityOfMother || 'FILIPINO');
        setFatherName(b.fatherName || 'UNKNOWN');
        setFatherCitizenship(b.nationalityOfFather || 'FILIPINO');
        setDateOfMarriage(b.dateOfMarriage || 'N/A');
        setPlaceOfMarriage(b.placeOfMarriage || 'N/A');
        setSpouseOrParentName(`${b.fatherName || 'UNKNOWN'} / ${b.motherMaidenName || 'UNKNOWN'}`);
        setEventDate(b.dateOfBirth);
        setEventPlace(b.placeOfBirth);
        setRequestedBy(b.motherMaidenName || b.name);
        setReasonOrDetails(b.remarks || 'AVAILABLE AND FOUND IN BOOK OF LIVE BIRTHS.');
      } else if (selectedRecord.category === 'deaths') {
        const d = selectedRecord as DeathRecord;
        setFormType('LCR_FORM_2');
        setPersonName(d.nameOfDeceased);
        setSpouseOrParentName(`CAUSE: ${d.causeOfDeathImmediate || 'UNSPECIFIED'}`);
        setEventDate(`${d.dateOfDeathYear}-${d.dateOfDeathMonth}-${d.dateOfDeathDay}`);
        setEventPlace(d.placeOfDeath);
        setRequestedBy(d.nameOfDeceased + ' FAMILY / NEXT OF KIN');
        setReasonOrDetails('AVAILABLE AND FOUND IN BOOK OF DEATHS.');
      } else if (selectedRecord.category === 'marriages') {
        const m = selectedRecord as MarriageRecord;
        setFormType('LCR_FORM_3');
        setPersonName(`${m.husbandName} & ${m.wifeName}`);
        setSpouseOrParentName(`SOLEMNIZED BY: ${m.solemnizingOfficer}`);
        setEventDate(m.dateOfMarriage);
        setEventPlace(m.placeOfMarriage);
        setRequestedBy(m.husbandName);
        setReasonOrDetails('AVAILABLE AND FOUND IN BOOK OF MARRIAGES.');
      }
    } else {
      // Blank setup
      setFormType('LCR_FORM_1');
      setFormLetter('A');
      setPersonName('');
      setSpouseOrParentName('');
      setEventDate('');
      setEventPlace(`${siteSettings.municipality}, ${siteSettings.province}`);
      setBookNumber('');
      setPageNumber('');
      setRegistryNumber('');
      setRegistryDate('');
      setRequestedBy('');
      setReasonOrDetails('');
      setSex('MALE');
      setMotherName('');
      setMotherCitizenship('FILIPINO');
      setFatherName('');
      setFatherCitizenship('FILIPINO');
      setDateOfMarriage('');
      setPlaceOfMarriage('');
    }

    if (defaultStaff) {
      setSelectedStaffId(defaultStaff.id);
      setVerifierName(defaultStaff.name);
      setVerifierTitle(defaultStaff.title);
      setIncludeVerifier(true);
    } else {
      setSelectedStaffId('none');
      setVerifierName('');
      setVerifierTitle('');
      setIncludeVerifier(false);
    }

    setPreviewMode(false);
  }, [isOpen, selectedRecord, siteSettings, defaultStaff]);

  const activeCertNumber = useMemo(() => {
    if (certNumber && certNumber.trim().length > 0) return certNumber.trim();
    return formatLcrCertNumber(orNumber, formType, formLetter, dateIssued);
  }, [certNumber, orNumber, formType, formLetter, dateIssued]);

  const activeVerificationCode = useMemo(() => {
    return activeCertNumber;
  }, [activeCertNumber]);

  const verificationUrl = useMemo(() => {
    return `${window.location.origin}${window.location.pathname}?verify=${encodeURIComponent(activeCertNumber)}`;
  }, [activeCertNumber]);

  const placeholderValues: Record<string, string> = useMemo(() => {
    return {
      '{{REGISTRY_NO}}': registryNumber || 'N/A',
      '{{REGISTRY_NUMBER}}': registryNumber || 'N/A',
      '{{DATE_OF_REGISTRATION}}': formatDateDDMMMYYYY(registryDate || dateIssued),
      '{{REGISTRY_DATE}}': formatDateDDMMMYYYY(registryDate || dateIssued),
      '{{NAME_OF_CHILD}}': personName,
      '{{CHILD_NAME}}': personName,
      '{{PERSON_NAME}}': personName,
      '{{SEX}}': sex,
      '{{DATE_OF_BIRTH}}': formatDateDDMMMYYYY(eventDate),
      '{{PLACE_OF_BIRTH}}': eventPlace,
      '{{NAME_OF_MOTHER}}': motherName,
      '{{MOTHER_NAME}}': motherName,
      '{{CITIZENSHIP_OF_MOTHER}}': motherCitizenship,
      '{{CITIZENSHIP_OF_THE_MOTHER}}': motherCitizenship,
      '{{NAME_OF_FATHER}}': fatherName,
      '{{NAME_OF_THE_FATHER}}': fatherName,
      '{{FATHER_NAME}}': fatherName,
      '{{CITIZENSHIP_OF_FATHER}}': fatherCitizenship,
      '{{CITIZENSHIP_OF_THE_FATHER}}': fatherCitizenship,
      '{{DATE_OF_MARRIAGE}}': formatDateDDMMMYYYY(dateOfMarriage),
      '{{PLACE_OF_MARRIAGE}}': placeOfMarriage || 'N/A',
      '{{REMARKS}}': reasonOrDetails || 'NONE',
      '{{REMARKS_TEXT}}': reasonOrDetails || 'NONE',
      '{{EVENT_DATE}}': formatDateDDMMMYYYY(eventDate),
      '{{EVENT_PLACE}}': eventPlace,
      '{{BOOK_NUMBER}}': bookNumber || 'N/A',
      '{{PAGE_NUMBER}}': pageNumber || 'N/A',
      '{{REQUESTED_BY}}': requestedBy,
      '{{PURPOSE}}': purpose,
      '{{MCR_OFFICER_NAME}}': siteSettings.mcrOfficerName,
      '{{MCR_OFFICER_TITLE}}': siteSettings.mcrOfficerTitle,
      '{{VERIFIER_NAME}}': includeVerifier ? verifierName : '',
      '{{VERIFIER_TITLE}}': includeVerifier ? verifierTitle : '',
      '{{PROVINCE}}': siteSettings.province,
      '{{MUNICIPALITY}}': siteSettings.municipality,
      '{{DATE_ISSUED}}': formatDateDDMMMYYYY(dateIssued),
      '{{DATE_PAID}}': formatDateDDMMMYYYY(dateIssued),
      '{{PAYMENT_DATE}}': formatDateDDMMMYYYY(dateIssued),
      '{{OR_NUMBER}}': orNumber,
      '{{AMOUNT_PAID}}': amountPaid,
      '{{SPOUSE_PARENT_NAME}}': spouseOrParentName,
      '{{CERT_NUMBER}}': activeCertNumber,
      '{{CERTIFICATE_NUMBER}}': activeCertNumber,
      '{{cert_number}}': activeCertNumber,
      '{{certificate_number}}': activeCertNumber,
      '{{VERIFICATION_CODE}}': includeQrCode ? activeCertNumber : '',
      '{{verification_code}}': includeQrCode ? activeCertNumber : '',
      '{{QR_CODE}}': includeQrCode ? generateQrSvgString(activeCertNumber, 64) : '',
      '{{qr_code}}': includeQrCode ? generateQrSvgString(activeCertNumber, 64) : '',
    };
  }, [
    registryNumber,
    registryDate,
    dateIssued,
    personName,
    sex,
    eventDate,
    eventPlace,
    motherName,
    motherCitizenship,
    fatherName,
    fatherCitizenship,
    dateOfMarriage,
    placeOfMarriage,
    reasonOrDetails,
    bookNumber,
    pageNumber,
    requestedBy,
    purpose,
    siteSettings,
    orNumber,
    amountPaid,
    spouseOrParentName,
    verifierName,
    verifierTitle,
    includeVerifier,
    includeQrCode,
    activeCertNumber,
    activeVerificationCode,
    verificationUrl,
  ]);

  const getProcessedWysiwygHtml = () => {
    if (!customTemplate?.freeformHtml) return '';
    let html = customTemplate.freeformHtml;

    // Clean up any leaked or unescaped contenteditable attributes or quotes from earlier edits/badges
    html = html.replace(/\s*contenteditable=(?:"false"|'false'|false)/gi, '');
    html = html.replace(/data-token="\{\{(?:QR_CODE|qr_code)\}\}"/gi, 'data-qr="true"');
    html = html.replace(/data-token="<svg[\s\S]*?<\/svg>"/gi, 'data-qr="true"');
    html = html.replace(/&quot;\s*contenteditable=&quot;false&quot;&gt;/gi, '');

    // Remove any unintended nested QR code placed directly inside MCR signatory column at the top
    html = html.replace(
      /<div style="margin-top:\s*14px;\s*display:\s*flex;\s*flex-direction:\s*column;\s*align-items:\s*center;\s*justify-content:\s*center;">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi,
      '</div></div>'
    );

    // Deduplicate any repeated signatory blocks if present in saved HTML
    const signatoryMatches = html.match(/<!--\s*Signatories[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi);
    if (signatoryMatches && signatoryMatches.length > 1) {
      let count = 0;
      html = html.replace(/<!--\s*Signatories[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, (match) => {
        count++;
        return count === 1 ? match : '';
      });
    }

    // Strip out any redundant municipality jurisdiction sub-labels under MCR Title
    html = html.replace(/<div[^>]*font-size:\s*(?:8|9|10)px[^>]*>\s*Municipality of [^<]+<\/div>/gi, '');
    html = html.replace(/<div[^>]*>\s*Municipality of \{\{MUNICIPALITY\}\}\s*<\/div>/gi, '');

    if (includeQrCode) {
      // Dynamically replace any QR code SVG with the live QR code SVG encoding activeCertNumber
      html = html.replace(
        /<svg[^>]*shape-rendering="crispEdges"[^>]*>[\s\S]*?<\/svg>/gi,
        generateQrSvgString(activeCertNumber, 64)
      );

      // Replace any legacy verification codes or sample codes with the real active Certificate Number
      html = html.replace(/CRIS-[A-Z0-9]+-\d{4}-[A-Z0-9-]+/gi, activeCertNumber);
      html = html.replace(/CRIS-CERT-\d{4}-\d+/gi, activeCertNumber);
      html = html.replace(/CERT-2026-8921/g, activeCertNumber);
      html = html.replace(/CERT-2026-0046/g, activeCertNumber);
      html = html.replace(/CRIS-CLB-2026-8921-A1/g, activeCertNumber);
      html = html.replace(/CRIS VERIFICATION CODE:\s*[A-Z0-9_-]*/gi, `CERTIFICATE NO: ${activeCertNumber}`);
    } else {
      // When includeQrCode is false, strip out QR code containers, SVGs, and specimen verification codes
      html = html.replace(/<div[^>]*data-qr-box="true"[^>]*>[\s\S]*?<\/div>/gi, '');
      html = html.replace(/<span[^>]*data-qr="true"[^>]*>[\s\S]*?<\/span>/gi, '');
      html = html.replace(/<svg[^>]*shape-rendering="crispEdges"[^>]*>[\s\S]*?<\/svg>/gi, '');
      html = html.replace(/CRIS-[A-Z0-9]+-\d{4}-[A-Z0-9-]+/gi, '');
      html = html.replace(/CRIS-CERT-\d{4}-\d+/gi, '');
      html = html.replace(/CERT-2026-8921/g, '');
      html = html.replace(/CERT-2026-0046/g, '');
      html = html.replace(/CRIS-CLB-2026-8921-A1/g, '');
      html = html.replace(/CRIS VERIFICATION CODE:\s*[A-Z0-9_-]*/gi, '');
    }

    let processed = replacePlaceholders(html, placeholderValues)
      .replace(/\s+for\s+<strong>\{\{PURPOSE\}\}<\/strong>\./gi, '.')
      .replace(/\s+for\s+\{\{PURPOSE\}\}\./gi, '.')
      .replace(/Date Issued:/gi, 'Date Paid:');

    // Clean up duplicate consecutive QR code SVGs or containers if both static SVG and {{QR_CODE}} token were present
    processed = processed.replace(/(<span[^>]*data-qr="true"[^>]*>[\s\S]*?<\/span>)\s*(?:<svg[^>]*shape-rendering="crispEdges"[^>]*>[\s\S]*?<\/svg>)+/gi, '$1');
    processed = processed.replace(/(<svg[^>]*shape-rendering="crispEdges"[^>]*>[\s\S]*?<\/svg>)\s*(?:<svg[^>]*shape-rendering="crispEdges"[^>]*>[\s\S]*?<\/svg>)+/gi, '$1');
    // Clean up any stray closing angle brackets left from earlier tag sanitization
    processed = processed.replace(/(<span[^>]*data-qr="true"[^>]*>[\s\S]*?<\/span>)\s*(?:&gt;|>)/gi, '$1');
    processed = processed.replace(/(<\/span>)\s*(?:&gt;|>)(?=\s*<)/gi, '$1');

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
                    <td style="border: none; padding: 1px 0;">&#8369; ${amountPaid || '150.00'}</td>
                  </tr>
                  <tr>
                    <td style="border: none; padding: 1px 6px 1px 0; font-weight: 500;">O.R. Number</td>
                    <td style="border: none; padding: 1px 4px;">:</td>
                    <td style="border: none; padding: 1px 0;">${orNumber || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="border: none; padding: 1px 6px 1px 0; font-weight: 500;">Date Paid</td>
                    <td style="border: none; padding: 1px 4px;">:</td>
                    <td style="border: none; padding: 1px 0;">${formatDateDDMMMYYYY(dateIssued)}</td>
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
                  ${generateQrSvgString(activeCertNumber, 60)}
                </span>
                <div style="margin-top: 4px; font-family: monospace; font-size: 9.5px; font-weight: bold; color: #1e293b; text-align: center;">
                  ${activeCertNumber}
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
      // Remove any redundant legacy payment text nested in the left column
      processed = processed.replace(/<div[^>]*>\s*<div>Amount Paid[\s\S]*?invalidates this certification\.<\/div>\s*<\/div>/gi, '');
      const lastCloseDiv = processed.lastIndexOf('</div>');
      if (lastCloseDiv !== -1) {
        processed = processed.substring(0, lastCloseDiv) + paymentAndQrFooterHtml + processed.substring(lastCloseDiv);
      } else {
        processed += paymentAndQrFooterHtml;
      }
    }

    return processed;
  };

  if (!isOpen) return null;

  const handleFormTypeSelect = (type: LcrFormType) => {
    setFormType(type);
    if (!isCustomCertNumber) {
      setCertNumber(formatLcrCertNumber(orNumber, type, formLetter, dateIssued));
    }
  };

  const handleLetterChange = (newLetter: LcrFormLetter) => {
    setFormLetter(newLetter);
    if (!isCustomCertNumber) {
      setCertNumber(formatLcrCertNumber(orNumber, formType, newLetter, dateIssued));
    }
    if (newLetter === 'A') {
      setReasonOrDetails('RECORD IS AVAILABLE AND TIMELY REGISTERED IN THE CIVIL REGISTRY ARCHIVES.');
    } else if (newLetter === 'B') {
      setReasonOrDetails(
        'AFTER DILIGENT SEARCH AND VERIFICATION IN THE ARCHIVE RECORDS OF THIS OFFICE, NO RECORD OF THE AFOREMENTIONED EVENT APPEARS IN THE CIVIL REGISTRY BOOK.'
      );
    } else if (newLetter === 'C') {
      setReasonOrDetails(
        'THE APPLICABLE CIVIL REGISTRY BOOK COVERING THE PERIOD WAS REPORTED DESTROYED, DAMAGED, OR LOST DUE TO WAR / FIRE / FLOOD / NORMAL WEAR AND TEAR.'
      );
    }
  };

  const handleOrNumberChange = (val: string) => {
    setOrNumber(val);
    if (!isCustomCertNumber) {
      setCertNumber(formatLcrCertNumber(val, formType, formLetter, dateIssued));
    }
  };

  const handleDateIssuedChange = (val: string) => {
    setDateIssued(val);
    if (!isCustomCertNumber) {
      setCertNumber(formatLcrCertNumber(orNumber, formType, formLetter, val));
    }
  };

  const openPrintWindow = (el: HTMLElement, title: string) => {
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((s) => s.outerHTML)
      .join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  ${styles}
  <style>
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    @page {
      size: 8.5in 13in;
      margin: 0;
    }
    html, body {
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 24px 0;
      font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .print-toolbar {
      max-width: 8.5in;
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
      width: 8.5in;
      max-width: 8.5in;
      min-height: 13in;
      box-sizing: border-box;
      margin: 0 auto;
      background: white;
      padding: 36px 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      position: relative;
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
        margin: 0 auto !important;
        box-shadow: none !important;
        border: none !important;
        max-width: 100% !important;
        width: 100% !important;
        position: relative !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      #printable-lcr-certificate, .wysiwyg-rendered-certificate {
        padding: 0 !important;
        margin: 0 !important;
        border: none !important;
        box-shadow: none !important;
        max-width: 100% !important;
        width: 100% !important;
        position: relative !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar no-print">
    <div>
      <div class="print-toolbar-title">${title}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Tip: In print destination, select "Save as PDF" (Paper Size: Legal / Folio 8.5 × 13 in) to save an exact PDF copy.</div>
    </div>
    <div class="print-toolbar-actions">
      <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF (8.5 × 13 in / PH Legal)</button>
      <button class="btn-close" onclick="window.close()">Close Window</button>
    </div>
  </div>
  <div class="print-sheet">
    ${el.outerHTML}
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 400);
    });
  </script>
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

  const buildCurrentCert = (): IssuedCertification => {
    const certNumber = activeCertNumber;
    const verificationCode = activeVerificationCode;
    const wysiwygHtml = getProcessedWysiwygHtml();
    const bgImage =
      customTemplate?.customBackgroundUrl ||
      customTemplate?.watermark?.imageUrl ||
      (customTemplate?.watermark as any)?.customImageUrl ||
      (customTemplate as any)?.backgroundWatermarkUrl ||
      siteSettings.sealUrl;
    const bgOpacity =
      customTemplate?.backgroundOpacityPercent ??
      customTemplate?.watermark?.opacityPercent ??
      10;

    return {
      id: 'cert-' + Date.now(),
      certNumber,
      formType,
      formLetter,
      category: formType === 'LCR_FORM_1' ? 'births' : formType === 'LCR_FORM_2' ? 'deaths' : 'marriages',
      recordId: selectedRecord?.id,
      personName: toUpper(personName.trim()),
      spouseOrParentName: toUpper(spouseOrParentName.trim()),
      eventDate,
      eventPlace: toUpper(eventPlace.trim()),
      bookNumber: formLetter !== 'B' ? (toUpper(bookNumber.trim()) || 'N/A') : 'N/A',
      pageNumber: formLetter !== 'B' ? (toUpper(pageNumber.trim()) || 'N/A') : 'N/A',
      registryNumber: formLetter !== 'B' ? (toUpper(registryNumber.trim()) || 'N/A') : 'N/A',
      reasonOrDetails: toUpper(reasonOrDetails.trim()),
      requestedBy: toUpper(requestedBy.trim()),
      purpose: toUpper(purpose.trim()),
      orNumber: toUpper(orNumber.trim()),
      amountPaid: amountPaid.trim(),
      dateIssued,
      issuedByUsername: currentUser.username,
      mcrOfficerName: siteSettings.mcrOfficerName,
      mcrOfficerTitle: siteSettings.mcrOfficerTitle,
      verifierName: includeVerifier && verifierName.trim() ? verifierName.trim() : undefined,
      verifierTitle: includeVerifier && verifierTitle.trim() ? verifierTitle.trim() : undefined,
      verificationCode: includeQrCode ? verificationCode : '',
      createdAt: new Date().toISOString(),
      // Extended fields to retain 100% of details in database & PDF export
      sex: sex || 'N/A',
      motherName: motherName ? toUpper(motherName.trim()) : '',
      motherCitizenship: motherCitizenship ? toUpper(motherCitizenship.trim()) : 'FILIPINO',
      fatherName: fatherName ? toUpper(fatherName.trim()) : '',
      fatherCitizenship: fatherCitizenship ? toUpper(fatherCitizenship.trim()) : 'FILIPINO',
      dateOfMarriage: dateOfMarriage || 'N/A',
      placeOfMarriage: placeOfMarriage ? toUpper(placeOfMarriage.trim()) : 'N/A',
      registryDate: registryDate || dateIssued,
      renderedHtml: wysiwygHtml || undefined,
      customBackgroundUrl: bgImage || undefined,
      backgroundOpacityPercent: bgOpacity,
    };
  };

  const handlePrint = (forceNewTab = false) => {
    // Automatically persist certification to storage upon print so it is in Issued Certifications & Verification Portal
    try {
      const certToSave = buildCurrentCert();
      onSaveCert(certToSave);
      storageService.saveCertification(certToSave);
    } catch (e) {
      console.error('Auto-save certification on print error:', e);
    }

    const el = document.getElementById('printable-lcr-certificate');
    if (!el) {
      setPreviewMode(true);
      setTimeout(() => {
        const retryEl = document.getElementById('printable-lcr-certificate');
        if (retryEl) executePrint(retryEl, forceNewTab);
      }, 200);
      return;
    }
    executePrint(el, forceNewTab);
  };

  const executePrint = (el: HTMLElement, forceNewTab: boolean) => {
    const title = `LCR Form ${formType.slice(-1)}${formLetter} - ${formMeta.title}`;

    if (forceNewTab) {
      openPrintWindow(el, title);
      return;
    }

    // Inside sandboxed iframes (e.g. AI Studio preview), browser sandbox blocks window.print()
    const inIframe = window.self !== window.top;
    if (inIframe) {
      openPrintWindow(el, title);
      return;
    }

    try {
      window.print();
    } catch {
      openPrintWindow(el, title);
    }
  };

  const handleIssueCertification = () => {
    if (selectedRecord) {
      if (selectedRecord.category === 'births' && formType !== 'LCR_FORM_1') {
        alert('Validation Restriction: Birth records can only be issued under LCR Form 1x (1A, 1B, 1C).');
        return;
      }
      if (selectedRecord.category === 'deaths' && formType !== 'LCR_FORM_2') {
        alert('Validation Restriction: Death records can only be issued under LCR Form 2x (2A, 2B, 2C).');
        return;
      }
      if (selectedRecord.category === 'marriages' && formType !== 'LCR_FORM_3') {
        alert('Validation Restriction: Marriage records can only be issued under LCR Form 3x (3A, 3B, 3C).');
        return;
      }
    }

    const newCert = buildCurrentCert();
    onSaveCert(newCert);
    storageService.saveCertification(newCert);
    setPreviewMode(true);
  };

  const getFormTitle = () => {
    const event = formType === 'LCR_FORM_1' ? 'BIRTH' : formType === 'LCR_FORM_2' ? 'DEATH' : 'MARRIAGE';
    const status =
      formLetter === 'A' ? 'AVAILABLE' : formLetter === 'B' ? 'NOT AVAILABLE' : 'DESTROYED / LOST / RECONSTRUCTED';
    const formNum = formType === 'LCR_FORM_1' ? '1' : formType === 'LCR_FORM_2' ? '2' : '3';
    return {
      code: `LCR FORM NO. ${formNum}${formLetter}`,
      title: `CERTIFICATION OF ${event} (${status})`,
      event,
    };
  };

  const formMeta = getFormTitle();

  const isBirth = selectedRecord?.category === 'births';
  const isDeath = selectedRecord?.category === 'deaths';
  const isMarriage = selectedRecord?.category === 'marriages';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Issue Civil Registry Certification</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                  {formMeta.code}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Official Certification for Birth (LCR Form 1x), Death (LCR Form 2x), and Marriage (LCR Form 3x)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {previewMode && (
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center text-xs font-semibold text-slate-700 bg-white border border-slate-300 px-2.5 py-1.5 rounded-lg shadow-2xs cursor-pointer select-none hover:bg-slate-50">
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
                <button
                  type="button"
                  onClick={() => handlePrint(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                  title="Print Certificate (8.5 × 13 in / PH Legal)"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg shadow-2xs transition cursor-pointer"
                  title="Open certificate in dedicated tab to print without iframe restrictions"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Toggle Bar */}
        <div className="bg-slate-50 px-6 py-2 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                !previewMode
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Form Parameters
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                previewMode
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Official Certificate Preview (8.5 × 13 in)
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Issuing Officer: <strong className="text-slate-800">{currentUser.name}</strong>
          </span>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {!previewMode ? (
            /* Parameters Form */
            <div className="space-y-4">
              {/* Mandatory Index Binding Notification */}
              {selectedRecord && (
                <div className="px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2.5 text-xs text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>Rule Enforced:</strong> Linked to{' '}
                    <strong className="uppercase font-bold">{selectedRecord.category.replace('-', ' ')}</strong> index. Only{' '}
                    <strong className="underline font-bold text-blue-700">
                      {isBirth ? 'LCR Form 1x (Birth: 1A, 1B, 1C)' : isDeath ? 'LCR Form 2x (Death: 2A, 2B, 2C)' : 'LCR Form 3x (Marriage: 3A, 3B, 3C)'}
                    </strong>{' '}
                    can be issued.
                  </span>
                </div>
              )}

              {/* Form Type & Status Letter Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    1. Select LCR Form Series
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={isDeath || isMarriage}
                      onClick={() => handleFormTypeSelect('LCR_FORM_1')}
                      className={`px-2 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer text-center disabled:opacity-35 disabled:cursor-not-allowed ${
                        formType === 'LCR_FORM_1'
                          ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      LCR Form 1
                      <span className={`block text-[10px] ${formType === 'LCR_FORM_1' ? 'text-blue-100 font-medium' : 'text-slate-500'}`}>
                        Birth (1x)
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={isBirth || isMarriage}
                      onClick={() => handleFormTypeSelect('LCR_FORM_2')}
                      className={`px-2 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer text-center disabled:opacity-35 disabled:cursor-not-allowed ${
                        formType === 'LCR_FORM_2'
                          ? 'bg-amber-600 border-amber-600 text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      LCR Form 2
                      <span className={`block text-[10px] ${formType === 'LCR_FORM_2' ? 'text-amber-100 font-medium' : 'text-slate-500'}`}>
                        Death (2x)
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={isBirth || isDeath}
                      onClick={() => handleFormTypeSelect('LCR_FORM_3')}
                      className={`px-2 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer text-center disabled:opacity-35 disabled:cursor-not-allowed ${
                        formType === 'LCR_FORM_3'
                          ? 'bg-pink-600 border-pink-600 text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      LCR Form 3
                      <span className={`block text-[10px] ${formType === 'LCR_FORM_3' ? 'text-pink-100 font-medium' : 'text-slate-500'}`}>
                        Marriage (3x)
                      </span>
                    </button>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    2. Select Letter Code (A, B, or C)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLetterChange('A')}
                      className={`px-2 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer text-center ${
                        formLetter === 'A'
                          ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Letter A
                      <span className={`block text-[10px] ${formLetter === 'A' ? 'text-emerald-100' : 'text-emerald-600 font-semibold'}`}>
                        AVAILABLE
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLetterChange('B')}
                      className={`px-2 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer text-center ${
                        formLetter === 'B'
                          ? 'bg-rose-600 border-rose-600 text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Letter B
                      <span className={`block text-[10px] ${formLetter === 'B' ? 'text-rose-100' : 'text-rose-600 font-semibold'}`}>
                        NOT AVAIL
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLetterChange('C')}
                      className={`px-2 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer text-center ${
                        formLetter === 'C'
                          ? 'bg-orange-600 border-orange-600 text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Letter C
                      <span className={`block text-[10px] ${formLetter === 'C' ? 'text-orange-100' : 'text-orange-600 font-semibold'}`}>
                        DESTROYED
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Core Particulars */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Subject Information (All Capitalized)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Full Name of Subject Person <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={personName}
                      onChange={(e) => setPersonName(toUpper(e.target.value))}
                      placeholder="FIRST, MIDDLE, LAST"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 uppercase font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Parents / Spouse Particulars
                    </label>
                    <input
                      type="text"
                      value={spouseOrParentName}
                      onChange={(e) => setSpouseOrParentName(toUpper(e.target.value))}
                      placeholder="FATHER / MOTHER OR SPOUSE NAME"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Date of Event (Birth / Death / Marriage)
                    </label>
                    <input
                      type="text"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Place of Event</label>
                    <input
                      type="text"
                      value={eventPlace}
                      onChange={(e) => setEventPlace(toUpper(e.target.value))}
                      placeholder="MUNICIPALITY, PROVINCE"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Form 1A Specific Particulars (13 Standard Fields) */}
                {formType === 'LCR_FORM_1' && formLetter === 'A' && (
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                        LCR Form 1A Detailed Particulars (13 Standard Fields)
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-300">
                        Form 1A
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Sex of Child</label>
                        <select
                          value={sex}
                          onChange={(e) => setSex(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:ring-1 focus:ring-blue-500 font-semibold"
                        >
                          <option value="MALE">MALE</option>
                          <option value="FEMALE">FEMALE</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Name of Mother</label>
                        <input
                          type="text"
                          value={motherName}
                          onChange={(e) => setMotherName(toUpper(e.target.value))}
                          placeholder="Mother's Full Maiden Name"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 uppercase focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Citizenship of Mother</label>
                        <input
                          type="text"
                          value={motherCitizenship}
                          onChange={(e) => setMotherCitizenship(toUpper(e.target.value))}
                          placeholder="FILIPINO"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 uppercase focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Name of the Father</label>
                        <input
                          type="text"
                          value={fatherName}
                          onChange={(e) => setFatherName(toUpper(e.target.value))}
                          placeholder="Father's Full Name"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 uppercase focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Citizenship of Father</label>
                        <input
                          type="text"
                          value={fatherCitizenship}
                          onChange={(e) => setFatherCitizenship(toUpper(e.target.value))}
                          placeholder="FILIPINO"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 uppercase focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Date of Marriage of Parents</label>
                        <input
                          type="text"
                          value={dateOfMarriage}
                          onChange={(e) => setDateOfMarriage(toUpper(e.target.value))}
                          placeholder="YYYY-MM-DD or NOT MARRIED"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 uppercase focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Place of Marriage of Parents</label>
                        <input
                          type="text"
                          value={placeOfMarriage}
                          onChange={(e) => setPlaceOfMarriage(toUpper(e.target.value))}
                          placeholder="Municipality, Province or N/A"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 uppercase focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Registry Coordinates (Enabled for Form A and C) */}
                {formLetter !== 'B' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Book Number (Optional)</label>
                      <input
                        type="text"
                        value={bookNumber}
                        onChange={(e) => setBookNumber(toUpper(e.target.value))}
                        placeholder="Optional"
                        className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 font-mono uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Page Number (Optional)</label>
                      <input
                        type="text"
                        value={pageNumber}
                        onChange={(e) => setPageNumber(toUpper(e.target.value))}
                        placeholder="Optional"
                        className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 font-mono uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Registry Number</label>
                      <input
                        type="text"
                        value={registryNumber}
                        onChange={(e) => setRegistryNumber(toUpper(e.target.value))}
                        placeholder="2026-0045"
                        className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 font-mono uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Date of Registration</label>
                      <input
                        type="date"
                        value={registryDate}
                        onChange={(e) => setRegistryDate(e.target.value)}
                        className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                    <strong>Note for Form {formType.slice(-1)}B (Not Available):</strong> Book and Page coordinates are
                    marked as Not Available in compliance with national civil registry standards.
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Certification Remarks / Legal Certification Text
                  </label>
                  <textarea
                    rows={2}
                    value={reasonOrDetails}
                    onChange={(e) => setReasonOrDetails(toUpper(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Administrative & Payment Details */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Issuance & Official Receipt Particulars
                </h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Requested By</label>
                  <input
                    type="text"
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(toUpper(e.target.value))}
                    placeholder="NAME OF APPLICANT"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-700">Certificate No.</label>
                      <span className="text-[9px] text-blue-600 font-mono font-bold">CUL-YYYY-OR-1X</span>
                    </div>
                    <input
                      type="text"
                      value={certNumber}
                      onChange={(e) => {
                        setCertNumber(toUpper(e.target.value));
                        setIsCustomCertNumber(true);
                      }}
                      placeholder="CUL-2026-4463123-1A"
                      className="w-full px-3 py-1.5 bg-blue-50/50 border border-blue-200 rounded-lg text-xs text-blue-950 font-mono font-bold uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">O.R. Number</label>
                    <input
                      type="text"
                      value={orNumber}
                      onChange={(e) => handleOrNumberChange(toUpper(e.target.value))}
                      placeholder="4463123"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono uppercase focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Amount Paid (₱)</label>
                    <input
                      type="text"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="150.00"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date Paid</label>
                    <input
                      type="date"
                      value={dateIssued}
                      onChange={(e) => handleDateIssuedChange(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Document Verifier (MCR Staff) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Document Verifier (MCR Staff)
                  </h4>
                  <label className="inline-flex items-center text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeVerifier}
                      onChange={(e) => setIncludeVerifier(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 mr-1.5 focus:ring-blue-500"
                    />
                    Include in Print
                  </label>
                </div>

                {includeVerifier && (
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Select Authorized MCR Staff
                      </label>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => handleStaffChange(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {siteSettings.mcrStaff && siteSettings.mcrStaff.length > 0 ? (
                          siteSettings.mcrStaff.map((staff) => (
                            <option key={staff.id} value={staff.id}>
                              {staff.name} — {staff.title} {staff.isDefault ? '(Default)' : ''}
                            </option>
                          ))
                        ) : (
                          <>
                            {siteSettings.assistantMcrName && (
                              <option value="assistant-mcr">
                                {siteSettings.assistantMcrName} — {siteSettings.assistantMcrTitle || 'Assistant MCR'}
                              </option>
                            )}
                          </>
                        )}
                        <option value="custom">Custom Verifier...</option>
                        <option value="none">None</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-1">Verifier Name</label>
                        <input
                          type="text"
                          value={verifierName}
                          onChange={(e) => {
                            setVerifierName(toUpper(e.target.value));
                            setSelectedStaffId('custom');
                          }}
                          placeholder="STAFF FULL NAME"
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 uppercase focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-1">Designation / Title</label>
                        <input
                          type="text"
                          value={verifierTitle}
                          onChange={(e) => {
                            setVerifierTitle(e.target.value);
                            setSelectedStaffId('custom');
                          }}
                          placeholder="e.g. Registration Officer I"
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Security QR Code & Verification Code (Certificate Number) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Security QR Code &amp; Verification Code (Certificate Number)
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Automatically generated per issued certification: <span className="font-mono font-bold text-blue-700">{activeCertNumber}</span>
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex items-center text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="toggle-include-qr-code"
                      checked={includeQrCode}
                      onChange={(e) => setIncludeQrCode(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 mr-2 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    Include in Print
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="issue-cert-generate-btn"
                  onClick={handleIssueCertification}
                  disabled={!personName.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Generate Official Certification</span>
                </button>
              </div>
            </div>
          ) : (
            /* Printable Official Philippine LCR Form Certificate Sheet */
            <div className="bg-slate-100 p-4 rounded-xl flex flex-col items-center border border-slate-200">
              {(() => {
                const bgImage =
                  customTemplate?.customBackgroundUrl ||
                  customTemplate?.watermark?.imageUrl ||
                  (customTemplate?.watermark as any)?.customImageUrl;
                const bgOpacity =
                  ((customTemplate?.backgroundOpacityPercent ??
                    customTemplate?.watermark?.opacityPercent ??
                    10) / 100);
                const isWatermarkEnabled =
                  Boolean(bgImage) || customTemplate?.watermark?.enabled !== false;
                const paperBgClass =
                  customTemplate?.watermark?.paperTint === 'cream'
                    ? 'bg-[#FDFCF7]'
                    : customTemplate?.watermark?.paperTint === 'parchment'
                    ? 'bg-[#FAF8F2]'
                    : 'bg-white';

                return (
                  <div
                    id="printable-lcr-certificate"
                    className={`w-full max-w-[816px] min-h-[1150px] ${paperBgClass} text-slate-950 ${
                      customTemplate?.editorMode === 'wysiwyg' ? 'p-0' : 'p-8 sm:p-12'
                    } shadow-2xl rounded-sm font-serif border border-slate-300 relative print:p-0 print:m-0 print:shadow-none print:border-none overflow-hidden`}
                  >
                    {/* Official Municipal Seal / Watermark Background */}
                    {isWatermarkEnabled && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
                        style={{
                          opacity: bgOpacity,
                          transform: customTemplate?.watermark?.rotationDegrees
                            ? `rotate(${customTemplate.watermark.rotationDegrees}deg)`
                            : undefined,
                          zIndex: 0,
                        }}
                      >
                        {bgImage ? (
                          <img
                            src={bgImage}
                            alt="Municipal Seal / Background Watermark"
                            className="max-w-[440px] max-h-[440px] object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : customTemplate?.watermark?.type === 'text' ? (
                          <span
                            className="font-black font-sans uppercase tracking-widest text-slate-900 whitespace-nowrap text-center"
                            style={{ fontSize: '38px' }}
                          >
                            {customTemplate.watermark.text || 'OFFICIAL RECORD'}
                          </span>
                        ) : (
                          <Building2
                            className="text-slate-900"
                            style={{
                              width: `${customTemplate?.watermark?.sizePx || 380}px`,
                              height: `${customTemplate?.watermark?.sizePx || 380}px`,
                            }}
                          />
                        )}
                      </div>
                    )}

                    {/* Certificate Document Content */}
                    <div className="relative z-10">
                      {/* Republic of the Philippines Header or WYSIWYG Content */}
                      {customTemplate?.editorMode === 'wysiwyg' && customTemplate?.freeformHtml ? (
                        <div
                          className="wysiwyg-rendered-certificate p-0 m-0 text-slate-900 leading-normal font-serif"
                          dangerouslySetInnerHTML={{
                            __html: getProcessedWysiwygHtml(),
                          }}
                        />
                      ) : (
                  <>
                    <div
                      className="pb-4 mb-5"
                      style={{
                        borderBottomWidth: `${customTemplate?.header?.dividerThickness ?? 2}px`,
                        borderBottomColor: customTemplate?.header?.dividerColor || '#0f172a',
                        borderBottomStyle: 'solid',
                      }}
                    >
                  <div className="flex items-center justify-between gap-4">
                    {/* Left Logo */}
                    {customTemplate?.logos?.showLeftLogo && (
                      <div className="shrink-0 flex items-center justify-center w-16 h-16">
                        {customTemplate.logos.leftLogoUrl ? (
                          <img
                            src={customTemplate.logos.leftLogoUrl}
                            alt="Left Seal"
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

                    {/* Header Text */}
                    <div className="text-center flex-1 space-y-0.5">
                      <p className="text-xs font-sans tracking-widest text-slate-600 uppercase">
                        {customTemplate?.header?.countryText || 'Republic of the Philippines'}
                      </p>
                      <p className="text-xs font-sans font-semibold tracking-wider text-slate-700 uppercase">
                        Province of {customTemplate?.header?.provinceText || siteSettings.province}
                      </p>
                      <p className="text-xs font-sans font-bold tracking-wider text-slate-900 uppercase">
                        Municipality of {customTemplate?.header?.municipalityText || siteSettings.municipality}
                      </p>
                      <h1 className="text-sm font-sans font-black tracking-wide text-slate-950 uppercase pt-1">
                        {customTemplate?.header?.officeNameText || siteSettings.officeName}
                      </h1>
                    </div>

                    {/* Right Logo */}
                    {customTemplate?.logos?.showRightLogo && (
                      <div className="shrink-0 flex items-center justify-center w-16 h-16">
                        {customTemplate.logos.rightLogoUrl ? (
                          <img
                            src={customTemplate.logos.rightLogoUrl}
                            alt="Right Seal"
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

                {/* Form Code and Date */}
                <div className="flex items-center justify-between text-xs font-sans mb-6">
                  <div>
                    <span className="font-bold text-slate-900 text-sm border-b border-slate-900 pb-0.5">
                      {formMeta.code}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5 font-mono">
                      Series of {new Date().getFullYear()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-600 block text-[11px]">Date: <strong>{formatDateDDMMMYYYY(dateIssued)}</strong></span>
                    <span className="text-[10px] text-blue-800 font-mono font-bold block">Cert No. {activeCertNumber}</span>
                    <span className="text-[10px] text-slate-500 font-mono">O.R. No. {orNumber}</span>
                  </div>
                </div>

                {/* Form Title */}
                <div className="text-center my-6">
                  <h2 className="text-base sm:text-lg font-black tracking-wider uppercase underline underline-offset-4 text-slate-950 font-sans">
                    {formMeta.title}
                  </h2>
                </div>

                {/* Body Text */}
                <div className="text-sm space-y-4 leading-relaxed text-slate-900">
                  <p className="font-bold font-sans tracking-wide">TO WHOM IT MAY CONCERN:</p>

                  {formLetter === 'A' && (
                    <>
                      <p className="indent-8 text-justify">
                        This is to certify that according to the Civil Registry Records of this office, the{' '}
                        <strong>{formMeta.event}</strong> record of{' '}
                        <span className="font-bold text-base uppercase underline">{personName}</span> is{' '}
                        <strong>AVAILABLE</strong> and duly registered under the following particulars:
                      </p>

                      {formType === 'LCR_FORM_1' && formLetter === 'A' ? (
                        <div className="my-4 border border-slate-800 font-sans text-xs">
                          <div className="grid grid-cols-2 border-b border-slate-800 p-1.5 bg-slate-50">
                            <span className="font-bold text-slate-800">REGISTRY NO:</span>
                            <span className="font-bold font-mono text-slate-900">{registryNumber || 'N/A'}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-1.5">
                            <span className="font-bold text-slate-800">DATE OF REGISTRATION:</span>
                            <span className="font-bold font-mono text-slate-900">{formatDateDDMMMYYYY(registryDate || dateIssued)}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-1.5 bg-slate-50">
                            <span className="font-bold text-slate-800">NAME OF CHILD:</span>
                            <span className="font-bold uppercase text-slate-900">{personName || 'N/A'}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-1.5">
                            <span className="font-bold text-slate-800">SEX:</span>
                            <span className="font-bold text-slate-900">{sex || 'N/A'}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-1.5 bg-slate-50">
                            <span className="font-bold text-slate-800">DATE OF BIRTH:</span>
                            <span className="font-bold font-mono text-slate-900">{formatDateDDMMMYYYY(eventDate)}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-1.5">
                            <span className="font-bold text-slate-800">PLACE OF BIRTH:</span>
                            <span className="font-bold text-slate-900">{eventPlace || 'N/A'}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-1.5 bg-slate-50">
                            <span className="font-bold text-slate-800">NAME OF MOTHER:</span>
                            <span className="font-bold uppercase text-slate-900">{motherName || 'N/A'}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-1.5">
                            <span className="font-bold text-slate-800">CITIZENSHIP OF THE MOTHER:</span>
                            <span className="font-bold text-slate-900">{motherCitizenship || 'FILIPINO'}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-1.5 bg-slate-50">
                            <span className="font-bold text-slate-800">NAME OF THE FATHER:</span>
                            <span className="font-bold uppercase text-slate-900">{fatherName || 'UNKNOWN'}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-1.5">
                            <span className="font-bold text-slate-800">CITIZENSHIP OF THE FATHER:</span>
                            <span className="font-bold text-slate-900">{fatherCitizenship || 'FILIPINO'}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-1.5 bg-slate-50">
                            <span className="font-bold text-slate-800">DATE OF MARRIAGE:</span>
                            <span className="font-bold font-mono text-slate-900">{formatDateDDMMMYYYY(dateOfMarriage)}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-1.5">
                            <span className="font-bold text-slate-800">PLACE OF MARRIAGE:</span>
                            <span className="font-bold text-slate-900">{placeOfMarriage || 'N/A'}</span>
                          </div>
                          <div className="grid grid-cols-2 p-1.5 bg-slate-50">
                            <span className="font-bold text-slate-800">REMARKS:</span>
                            <span className="font-semibold text-slate-900">{reasonOrDetails || 'NONE'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="my-4 border border-slate-800 font-sans text-xs">
                          <div className="grid grid-cols-2 border-b border-slate-800 p-2 bg-slate-50">
                            <span className="font-semibold text-slate-700">Registry Number:</span>
                            <span className="font-bold font-mono text-slate-900">{registryNumber || 'N/A'}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-2">
                            <span className="font-semibold text-slate-700">Book Number:</span>
                            <span className="font-bold font-mono text-slate-900">{bookNumber || 'N/A'}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-2 bg-slate-50">
                            <span className="font-semibold text-slate-700">Page Number:</span>
                            <span className="font-bold font-mono text-slate-900">{pageNumber || 'N/A'}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-2">
                            <span className="font-semibold text-slate-700">Date of Registration:</span>
                            <span className="font-bold font-mono text-slate-900">{formatDateDDMMMYYYY(registryDate || dateIssued)}</span>
                          </div>
                          <div className="grid grid-cols-2 border-b border-slate-800 p-2 bg-slate-50">
                            <span className="font-semibold text-slate-700">Date & Place of Event:</span>
                            <span className="font-bold font-mono text-slate-900">
                              {formatDateDDMMMYYYY(eventDate)} at {eventPlace || 'N/A'}
                            </span>
                          </div>
                          {spouseOrParentName && (
                            <div className="grid grid-cols-2 p-2">
                              <span className="font-semibold text-slate-700">Parents / Spouse:</span>
                              <span className="font-bold text-slate-900">{spouseOrParentName}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {formLetter === 'B' && (
                    <p className="indent-8 text-justify">
                      This is to certify that after a careful and diligent search made in the records and archives of
                      this office, the record of <strong>{formMeta.event}</strong> of{' '}
                      <span className="font-bold text-base uppercase underline">{personName}</span>, who was reportedly
                      born/married/died on <strong>{formatDateDDMMMYYYY(eventDate)}</strong> at{' '}
                      <strong>{eventPlace || 'THIS MUNICIPALITY'}</strong>, does{' '}
                      <strong>NOT APPEAR OR CANNOT BE FOUND</strong> in the Civil Registry Books of this municipality.
                    </p>
                  )}

                  {formLetter === 'C' && (
                    <p className="indent-8 text-justify">
                      This is to certify that the records of <strong>{formMeta.event}</strong> covering the year{' '}
                      <strong>{eventDate ? eventDate.split('-')[0] : 'PERTAINING PERIOD'}</strong>, including the entry of{' '}
                      <span className="font-bold text-base uppercase underline">{personName}</span>, are{' '}
                      <strong>DESTROYED / LOST / UNAVAILABLE</strong> in this office due to force majeure / fire /
                      typhoon / wear and tear.
                    </p>
                  )}

                  {reasonOrDetails && (
                    <div className="p-2.5 bg-slate-50 border-l-2 border-slate-900 text-xs italic">
                      <strong>Remarks / Annotation:</strong> {reasonOrDetails}
                    </div>
                  )}

                  <p className="indent-8 text-justify">
                    This certification is issued upon the request of{' '}
                    <strong>{requestedBy || 'THE INTERESTED PARTY'}</strong>.
                  </p>
                </div>

                {/* Signatory & Official Seal */}
                <div className="mt-8 pt-2 flex items-start justify-between font-sans gap-6">
                  {/* Left Column: VERIFIED BY */}
                  <div className="text-left font-sans text-xs min-w-[240px]">
                    {includeVerifier && (
                      <>
                        <div className="font-bold text-slate-900 tracking-wide text-xs mb-3">
                          VERIFIED BY:
                        </div>
                        <div className="text-center w-60 my-2">
                          <div className="font-bold text-slate-950 text-sm uppercase font-sans">
                            {verifierName.trim() || 'IGMEDIO JR. S. TABON'}
                          </div>
                          <div className="text-xs text-slate-800 font-medium mt-0.5">
                            {verifierTitle.trim() || 'RCO - II'}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Column: Municipal Civil Registrar Signatory */}
                  <div className="text-center min-w-[240px] pt-4 flex flex-col items-center">
                    <div className="text-center w-full">
                      <div className="border-b border-slate-900 pb-1 mb-1 font-bold text-xs uppercase text-slate-950">
                        {customTemplate?.footer?.signatoryName || siteSettings.mcrOfficerName}
                      </div>
                      <div className="text-[11px] text-slate-800 font-medium">
                        {customTemplate?.footer?.signatoryTitle || siteSettings.mcrOfficerTitle}
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
                            <td className="py-0.5 font-semibold text-slate-900">₱ {amountPaid || '150.00'}</td>
                          </tr>
                          <tr>
                            <td className="pr-3 py-0.5 font-medium text-slate-800">O.R. Number</td>
                            <td className="pr-2 py-0.5">:</td>
                            <td className="py-0.5 font-semibold text-slate-900">{orNumber || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="pr-3 py-0.5 font-medium text-slate-800">Date Paid</td>
                            <td className="pr-2 py-0.5">:</td>
                            <td className="py-0.5 font-semibold text-slate-900">{formatDateDDMMMYYYY(dateIssued)}</td>
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
                          <QrCodeSvg value={activeCertNumber} size={60} />
                        </div>
                        <div className="mt-1 text-[9.5px] font-mono font-bold text-slate-900 text-center tracking-tight">
                          {activeCertNumber}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {customTemplate?.footer?.notes && (
                  <div className="mt-4 pt-2 border-t border-dotted border-slate-300 text-[10px] text-slate-600 italic">
                    {customTemplate.footer.notes}
                  </div>
                )}
              </>
            )}
                      </div>
                    </div>
                  );
                })()}

              {/* Action Buttons below preview */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handlePrint(false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Save as PDF / Print (8.5 × 13 in / PH Legal)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                  title="Open dedicated print window (recommended when previewing in iframe)"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in New Tab</span>
                </button>
                {onOpenDesigner && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDesigner(formType, formLetter);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
                    title="Open drag-and-drop designer for this form"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Customize in Designer</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition cursor-pointer"
                >
                  Edit Parameters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

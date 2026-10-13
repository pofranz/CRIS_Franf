import {
  MunicipalCertificateTemplate,
  CertificateLayoutBlock,
  LcrFormType,
  LcrFormLetter,
} from '../types';
import { formatDateDDMMMYYYY } from '../utils/dateUtils';

export interface PlaceholderDefinition {
  token: string;
  label: string;
  category: 'Form 1A Particulars' | 'Subject' | 'Registry Particulars' | 'Office & Municipality' | 'Transaction & Fees';
  description: string;
  sampleValue: string;
}

export const CERTIFICATE_PLACEHOLDERS: PlaceholderDefinition[] = [
  // LCR Form 1A (Birth) Particulars
  {
    token: '{{REGISTRY_NO}}',
    label: 'REGISTRY NO:',
    category: 'Form 1A Particulars',
    description: 'Civil registry number recorded for birth (LCR Form 1A)',
    sampleValue: '2026-0046',
  },
  {
    token: '{{DATE_OF_REGISTRATION}}',
    label: 'DATE OF REGISTRATION:',
    category: 'Form 1A Particulars',
    description: 'Official date the birth record was registered in the civil registrar',
    sampleValue: '18 FEBRUARY 2026',
  },
  {
    token: '{{NAME_OF_CHILD}}',
    label: 'NAME OF CHILD:',
    category: 'Form 1A Particulars',
    description: 'Full name of the child as recorded in the birth register',
    sampleValue: 'JUAN MIGUEL DELA CRUZ PO',
  },
  {
    token: '{{SEX}}',
    label: 'SEX:',
    category: 'Form 1A Particulars',
    description: 'Sex of the child (MALE or FEMALE)',
    sampleValue: 'MALE',
  },
  {
    token: '{{DATE_OF_BIRTH}}',
    label: 'DATE OF BIRTH:',
    category: 'Form 1A Particulars',
    description: 'Exact date when the child was born',
    sampleValue: '14 AUGUST 2001',
  },
  {
    token: '{{PLACE_OF_BIRTH}}',
    label: 'PLACE OF BIRTH:',
    category: 'Form 1A Particulars',
    description: 'Hospital, clinic, or exact municipality/province of birth',
    sampleValue: 'RURAL HEALTH UNIT, CULABA, BILIRAN',
  },
  {
    token: '{{NAME_OF_MOTHER}}',
    label: 'NAME OF MOTHER:',
    category: 'Form 1A Particulars',
    description: 'Full maiden name of the biological mother',
    sampleValue: 'MARIA CRISTINA DELA CRUZ',
  },
  {
    token: '{{CITIZENSHIP_OF_MOTHER}}',
    label: 'CITIZENSHIP OF THE MOTHER:',
    category: 'Form 1A Particulars',
    description: 'Nationality/citizenship of the mother at time of birth',
    sampleValue: 'FILIPINO',
  },
  {
    token: '{{NAME_OF_FATHER}}',
    label: 'NAME OF THE FATHER:',
    category: 'Form 1A Particulars',
    description: 'Full legal name of the father (or UNKNOWN if unacknowledged)',
    sampleValue: 'RAMON TANGKAP PO',
  },
  {
    token: '{{CITIZENSHIP_OF_FATHER}}',
    label: 'CITIZENSHIP OF THE FATHER:',
    category: 'Form 1A Particulars',
    description: 'Nationality/citizenship of the father',
    sampleValue: 'FILIPINO',
  },
  {
    token: '{{DATE_OF_MARRIAGE}}',
    label: 'DATE OF MARRIAGE:',
    category: 'Form 1A Particulars',
    description: 'Date parents were married (or NOT MARRIED / NOT APPLICABLE)',
    sampleValue: '12 JUNE 1998',
  },
  {
    token: '{{PLACE_OF_MARRIAGE}}',
    label: 'PLACE OF MARRIAGE:',
    category: 'Form 1A Particulars',
    description: 'Place where parents were married (or NOT MARRIED / NOT APPLICABLE)',
    sampleValue: 'CULABA, BILIRAN',
  },
  {
    token: '{{REMARKS}}',
    label: 'REMARKS:',
    category: 'Form 1A Particulars',
    description: 'Official civil registrar remarks, notations, court decrees, or NONE',
    sampleValue: 'NONE',
  },

  // Subject
  {
    token: '{{PERSON_NAME}}',
    label: 'Person Full Name',
    category: 'Subject',
    description: 'Full name of subject child, deceased person, or contracting couple',
    sampleValue: 'JUAN MIGUEL DELA CRUZ PO',
  },
  {
    token: '{{SPOUSE_PARENT_NAME}}',
    label: 'Parents / Spouse Particulars',
    category: 'Subject',
    description: 'Names of parents or spouse / cause of death details',
    sampleValue: 'RAMON TANGKAP PO / MARIA CRISTINA DELA CRUZ',
  },
  {
    token: '{{EVENT_DATE}}',
    label: 'Date of Event',
    category: 'Subject',
    description: 'Date of birth, death, or marriage',
    sampleValue: '14 AUGUST 2001',
  },
  {
    token: '{{EVENT_PLACE}}',
    label: 'Place of Event',
    category: 'Subject',
    description: 'Hospital, clinic, or residence location where event took place',
    sampleValue: 'Rural Health Unit, Culaba, Biliran',
  },
  {
    token: '{{REQUESTED_BY}}',
    label: 'Requested By',
    category: 'Subject',
    description: 'Name of the applicant, kin, or legal representative',
    sampleValue: 'MARIA CRISTINA DELA CRUZ (MOTHER)',
  },
  {
    token: '{{PURPOSE}}',
    label: 'Purpose of Issuance',
    category: 'Subject',
    description: 'Reason for requesting certification',
    sampleValue: 'PASSPORT APPLICATION AND LEGAL IDENTIFICATION',
  },

  // Registry Particulars
  {
    token: '{{REGISTRY_NUMBER}}',
    label: 'Registry Number',
    category: 'Registry Particulars',
    description: 'Official civil registry book entry number',
    sampleValue: '2026-0046',
  },
  {
    token: '{{BOOK_NUMBER}}',
    label: 'Book Number',
    category: 'Registry Particulars',
    description: 'Archive volume / book number in municipal archives',
    sampleValue: '54',
  },
  {
    token: '{{PAGE_NUMBER}}',
    label: 'Page Number',
    category: 'Registry Particulars',
    description: 'Page index in the civil registry book',
    sampleValue: '112',
  },
  {
    token: '{{REGISTRY_DATE}}',
    label: 'Date of Registration',
    category: 'Registry Particulars',
    description: 'Date when the document was accepted by the local civil registrar',
    sampleValue: '18 FEBRUARY 2026',
  },
  {
    token: '{{FORM_CODE}}',
    label: 'Form Code',
    category: 'Registry Particulars',
    description: 'Official Philippine municipal form code (e.g. LCR FORM NO. 1A)',
    sampleValue: 'LCR FORM NO. 1A',
  },
  {
    token: '{{FORM_TITLE}}',
    label: 'Form Title',
    category: 'Registry Particulars',
    description: 'Standard PSA / LCR document title',
    sampleValue: 'CERTIFICATION OF BIRTH',
  },
  {
    token: '{{STATUS_LETTER}}',
    label: 'Status Code',
    category: 'Registry Particulars',
    description: 'Letter classification (A=Available, B=Not Available, C=Destroyed)',
    sampleValue: 'A (AVAILABLE)',
  },
  {
    token: '{{REMARKS_TEXT}}',
    label: 'Remarks / Annotations',
    category: 'Registry Particulars',
    description: 'Administrative corrections, court decrees, or special remarks',
    sampleValue: 'FOUND IN GOOD CONDITION. DULY REGISTERED PURSUANT TO ACT NO. 3753.',
  },

  // Office & Municipality
  {
    token: '{{MUNICIPALITY}}',
    label: 'Municipality Name',
    category: 'Office & Municipality',
    description: 'Municipality configured in site settings',
    sampleValue: 'CULABA',
  },
  {
    token: '{{PROVINCE}}',
    label: 'Province Name',
    category: 'Office & Municipality',
    description: 'Province configured in site settings',
    sampleValue: 'BILIRAN',
  },
  {
    token: '{{OFFICE_NAME}}',
    label: 'Office Name',
    category: 'Office & Municipality',
    description: 'Municipal Civil Registrar office designation',
    sampleValue: 'OFFICE OF THE MUNICIPAL CIVIL REGISTRAR',
  },
  {
    token: '{{MCR_OFFICER_NAME}}',
    label: 'MCR Officer Name',
    category: 'Office & Municipality',
    description: 'Appointed Municipal Civil Registrar name',
    sampleValue: 'FRANCIS JEFF C. PO, MCR',
  },
  {
    token: '{{MCR_OFFICER_TITLE}}',
    label: 'MCR Officer Title',
    category: 'Office & Municipality',
    description: 'Official title of the registrar',
    sampleValue: 'Municipal Civil Registrar',
  },
  {
    token: '{{VERIFIER_NAME}}',
    label: 'Verifier / Staff Name',
    category: 'Office & Municipality',
    description: 'Name of the MCR staff member who verified the document',
    sampleValue: 'IGMEDIO JR. S. TABON',
  },
  {
    token: '{{VERIFIER_TITLE}}',
    label: 'Verifier / Staff Title',
    category: 'Office & Municipality',
    description: 'Designation or title of the verification staff member',
    sampleValue: 'RCO - II',
  },

  // Transaction & Fees
  {
    token: '{{CERT_NUMBER}}',
    label: 'Certificate Number',
    category: 'Transaction & Fees',
    description: 'Unique system-generated certification document number',
    sampleValue: 'CRIS-CERT-2026-0046',
  },
  {
    token: '{{OR_NUMBER}}',
    label: 'Official Receipt Number',
    category: 'Transaction & Fees',
    description: 'Treasury O.R. number issued for fees',
    sampleValue: 'OR-892145',
  },
  {
    token: '{{AMOUNT_PAID}}',
    label: 'Amount Paid',
    category: 'Transaction & Fees',
    description: 'Civil registry certification fee',
    sampleValue: '150.00',
  },
  {
    token: '{{DATE_ISSUED}}',
    label: 'Date Issued',
    category: 'Transaction & Fees',
    description: 'Official certification issuance date',
    sampleValue: '03 MARCH 2026',
  },
  {
    token: '{{VERIFICATION_CODE}}',
    label: 'Verification Code (Alphanumeric)',
    category: 'Transaction & Fees',
    description: 'Tamper-proof alphanumeric security verification hash (e.g. CRIS-CUL-2026-1655-1A)',
    sampleValue: 'CRIS-CLB-2026-8921-A1',
  },
  {
    token: '{{QR_CODE}}',
    label: 'Verification QR Code (Scannable Image)',
    category: 'Transaction & Fees',
    description: 'Dynamic scannable QR code image linked to public document verification',
    sampleValue: '[SCANNABLE_QR_CODE_IMAGE]',
  },
];

export const DEFAULT_BLOCKS: CertificateLayoutBlock[] = [
  {
    id: 'block-logos',
    type: 'logos',
    title: 'Official Municipal & National Emblems',
    enabled: true,
    order: 1,
    align: 'center',
    paddingTop: 4,
    paddingBottom: 4,
  },
  {
    id: 'block-header',
    type: 'header',
    title: 'Republic of the Philippines LGU Header',
    enabled: true,
    order: 2,
    align: 'center',
    paddingTop: 2,
    paddingBottom: 8,
  },
  {
    id: 'block-doc-meta',
    type: 'doc_meta',
    title: 'Form Series & Reference Header',
    enabled: true,
    order: 3,
    align: 'left',
    paddingTop: 4,
    paddingBottom: 8,
  },
  {
    id: 'block-doc-title',
    type: 'doc_title',
    title: 'Document Title & Certification Banner',
    enabled: true,
    order: 4,
    align: 'center',
    fontSize: 'lg',
    fontBold: true,
    paddingTop: 6,
    paddingBottom: 10,
  },
  {
    id: 'block-salutation',
    type: 'salutation',
    title: 'Formal Salutation (TO WHOM IT MAY CONCERN)',
    enabled: true,
    order: 5,
    align: 'left',
    fontBold: true,
    paddingTop: 4,
    paddingBottom: 6,
    customContent: 'TO WHOM IT MAY CONCERN:',
  },
  {
    id: 'block-certification-body',
    type: 'certification_body',
    title: 'Narrative Certification Clause',
    enabled: true,
    order: 6,
    align: 'justify',
    paddingTop: 4,
    paddingBottom: 8,
  },
  {
    id: 'block-particulars-table',
    type: 'particulars_table',
    title: 'Official Particulars Table (Registry & Event Data)',
    enabled: true,
    order: 7,
    align: 'left',
    paddingTop: 4,
    paddingBottom: 8,
    showBorderBox: true,
  },
  {
    id: 'block-remarks',
    type: 'remarks_annotation',
    title: 'Remarks, Annotations & Court Decrees',
    enabled: true,
    order: 8,
    align: 'left',
    paddingTop: 4,
    paddingBottom: 6,
  },
  {
    id: 'block-purpose',
    type: 'purpose_clause',
    title: 'Issuance Purpose & Requesting Party Clause',
    enabled: true,
    order: 9,
    align: 'justify',
    paddingTop: 4,
    paddingBottom: 10,
  },
  {
    id: 'block-signatory',
    type: 'signatory',
    title: 'Municipal Civil Registrar Signature Block',
    enabled: true,
    order: 10,
    align: 'right',
    paddingTop: 12,
    paddingBottom: 8,
  },
  {
    id: 'block-qr-verification',
    type: 'qr_verification',
    title: 'CRIS Security QR Code & Legal Citation',
    enabled: true,
    order: 11,
    align: 'left',
    paddingTop: 8,
    paddingBottom: 8,
  },
  {
    id: 'block-receipt-footer',
    type: 'receipt_footer',
    title: 'Official Receipt & Document Stamp Footer',
    enabled: true,
    order: 12,
    align: 'left',
    paddingTop: 8,
    paddingBottom: 4,
  },
];

export function createDefaultTemplate(
  formType: LcrFormType,
  formLetter: LcrFormLetter,
  municipality = 'CULABA',
  province = 'BILIRAN'
): MunicipalCertificateTemplate {
  const formNum = formType === 'LCR_FORM_1' ? '1' : formType === 'LCR_FORM_2' ? '2' : '3';
  const eventName =
    formType === 'LCR_FORM_1' ? 'BIRTH' : formType === 'LCR_FORM_2' ? 'DEATH' : 'MARRIAGE';
  const statusName =
    formLetter === 'A'
      ? 'AVAILABLE'
      : formLetter === 'B'
      ? 'NOT AVAILABLE / NON-AVAILABILITY'
      : 'DESTROYED / LOST RECORD';

  const title = `CERTIFICATION OF ${eventName}`;
  const code = `LCR FORM NO. ${formNum}${formLetter}`;

  return {
    id: `template-${formType}-${formLetter}`,
    formType,
    formLetter,
    name: `${code} - ${eventName} (${statusName})`,
    description: `Standard Philippine Municipal Civil Registry form for ${eventName.toLowerCase()} records (${statusName.toLowerCase()}).`,
    lastUpdated: new Date().toISOString(),

    header: {
      countryText: 'Republic of the Philippines',
      provincePrefix: `Province of ${province}`,
      municipalityPrefix: `Municipality of ${municipality}`,
      officeText: 'OFFICE OF THE MUNICIPAL CIVIL REGISTRAR',
      subText: 'Civil Registry Information & Archival Management System',
      showDivider: true,
      dividerStyle: 'double',
      align: 'center',
    },

    logos: {
      showLeftLogo: true,
      leftLogoType: 'municipal',
      showRightLogo: true,
      rightLogoType: 'psa',
      logoSizePx: 64,
    },

    watermark: {
      enabled: true,
      type: 'seal',
      text: 'MUNICIPAL CIVIL REGISTRAR - OFFICIAL RECORD',
      opacityPercent: 6,
      rotationDegrees: -18,
      sizePx: 380,
      paperTint: 'white',
    },

    footer: {
      showReceiptBar: true,
      showLegalCitation: true,
      legalCitationText: 'Civil Registry Law (Act No. 3753 / P.D. 651 / R.A. 9048 / R.A. 10172)',
      sealNoticeText: 'NOT VALID WITHOUT OFFICIAL DRY SEAL AND SIGNATURE OF THE REGISTRAR',
      showVerifierCode: true,
      customFooterNote: 'Verify integrity online via CRIS QR code. Document is issued for official civil registration purposes.',
    },

    blocks: JSON.parse(JSON.stringify(DEFAULT_BLOCKS)),
  };
}

export function replacePlaceholders(
  templateString: string,
  values: Record<string, string>
): string {
  let result = templateString;
  const merged: Record<string, string> = { ...values };

  // Form 1A token synchronization and fallbacks
  if (merged['{{REGISTRY_NO}}'] && !merged['{{REGISTRY_NUMBER}}']) {
    merged['{{REGISTRY_NUMBER}}'] = merged['{{REGISTRY_NO}}'];
  } else if (merged['{{REGISTRY_NUMBER}}'] && !merged['{{REGISTRY_NO}}']) {
    merged['{{REGISTRY_NO}}'] = merged['{{REGISTRY_NUMBER}}'];
  }

  if (merged['{{DATE_OF_REGISTRATION}}'] && !merged['{{REGISTRY_DATE}}']) {
    merged['{{REGISTRY_DATE}}'] = merged['{{DATE_OF_REGISTRATION}}'];
  } else if (merged['{{REGISTRY_DATE}}'] && !merged['{{DATE_OF_REGISTRATION}}']) {
    merged['{{DATE_OF_REGISTRATION}}'] = merged['{{REGISTRY_DATE}}'];
  }

  if (merged['{{NAME_OF_CHILD}}']) {
    if (!merged['{{PERSON_NAME}}']) merged['{{PERSON_NAME}}'] = merged['{{NAME_OF_CHILD}}'];
    if (!merged['{{CHILD_NAME}}']) merged['{{CHILD_NAME}}'] = merged['{{NAME_OF_CHILD}}'];
  } else if (merged['{{PERSON_NAME}}'] && !merged['{{NAME_OF_CHILD}}']) {
    merged['{{NAME_OF_CHILD}}'] = merged['{{PERSON_NAME}}'];
  }

  if (merged['{{DATE_OF_BIRTH}}'] && !merged['{{EVENT_DATE}}']) {
    merged['{{EVENT_DATE}}'] = merged['{{DATE_OF_BIRTH}}'];
  } else if (merged['{{EVENT_DATE}}'] && !merged['{{DATE_OF_BIRTH}}']) {
    merged['{{DATE_OF_BIRTH}}'] = merged['{{EVENT_DATE}}'];
  }

  if (merged['{{PLACE_OF_BIRTH}}'] && !merged['{{EVENT_PLACE}}']) {
    merged['{{EVENT_PLACE}}'] = merged['{{PLACE_OF_BIRTH}}'];
  } else if (merged['{{EVENT_PLACE}}'] && !merged['{{PLACE_OF_BIRTH}}']) {
    merged['{{PLACE_OF_BIRTH}}'] = merged['{{EVENT_PLACE}}'];
  }

  if (merged['{{NAME_OF_MOTHER}}'] && !merged['{{MOTHER_NAME}}']) {
    merged['{{MOTHER_NAME}}'] = merged['{{NAME_OF_MOTHER}}'];
  } else if (merged['{{MOTHER_NAME}}'] && !merged['{{NAME_OF_MOTHER}}']) {
    merged['{{NAME_OF_MOTHER}}'] = merged['{{MOTHER_NAME}}'];
  }

  if (merged['{{CITIZENSHIP_OF_MOTHER}}'] && !merged['{{MOTHER_CITIZENSHIP}}']) {
    merged['{{MOTHER_CITIZENSHIP}}'] = merged['{{CITIZENSHIP_OF_MOTHER}}'];
  } else if (merged['{{MOTHER_CITIZENSHIP}}'] && !merged['{{CITIZENSHIP_OF_MOTHER}}']) {
    merged['{{CITIZENSHIP_OF_MOTHER}}'] = merged['{{MOTHER_CITIZENSHIP}}'];
  }
  if (merged['{{CITIZENSHIP_OF_MOTHER}}'] && !merged['{{CITIZENSHIP_OF_THE_MOTHER}}']) {
    merged['{{CITIZENSHIP_OF_THE_MOTHER}}'] = merged['{{CITIZENSHIP_OF_MOTHER}}'];
  } else if (merged['{{CITIZENSHIP_OF_THE_MOTHER}}'] && !merged['{{CITIZENSHIP_OF_MOTHER}}']) {
    merged['{{CITIZENSHIP_OF_MOTHER}}'] = merged['{{CITIZENSHIP_OF_THE_MOTHER}}'];
  }

  if (merged['{{NAME_OF_FATHER}}'] && !merged['{{FATHER_NAME}}']) {
    merged['{{FATHER_NAME}}'] = merged['{{NAME_OF_FATHER}}'];
  } else if (merged['{{FATHER_NAME}}'] && !merged['{{NAME_OF_FATHER}}']) {
    merged['{{NAME_OF_FATHER}}'] = merged['{{FATHER_NAME}}'];
  }
  if (merged['{{NAME_OF_FATHER}}'] && !merged['{{NAME_OF_THE_FATHER}}']) {
    merged['{{NAME_OF_THE_FATHER}}'] = merged['{{NAME_OF_FATHER}}'];
  }

  if (merged['{{CITIZENSHIP_OF_FATHER}}'] && !merged['{{FATHER_CITIZENSHIP}}']) {
    merged['{{FATHER_CITIZENSHIP}}'] = merged['{{CITIZENSHIP_OF_FATHER}}'];
  } else if (merged['{{FATHER_CITIZENSHIP}}'] && !merged['{{CITIZENSHIP_OF_FATHER}}']) {
    merged['{{CITIZENSHIP_OF_FATHER}}'] = merged['{{FATHER_CITIZENSHIP}}'];
  }
  if (merged['{{CITIZENSHIP_OF_FATHER}}'] && !merged['{{CITIZENSHIP_OF_THE_FATHER}}']) {
    merged['{{CITIZENSHIP_OF_THE_FATHER}}'] = merged['{{CITIZENSHIP_OF_FATHER}}'];
  } else if (merged['{{CITIZENSHIP_OF_THE_FATHER}}'] && !merged['{{CITIZENSHIP_OF_FATHER}}']) {
    merged['{{CITIZENSHIP_OF_FATHER}}'] = merged['{{CITIZENSHIP_OF_THE_FATHER}}'];
  }

  if (merged['{{DATE_OF_MARRIAGE}}'] && !merged['{{DATE_OF_MARRIAGE_OF_PARENTS}}']) {
    merged['{{DATE_OF_MARRIAGE_OF_PARENTS}}'] = merged['{{DATE_OF_MARRIAGE}}'];
  } else if (merged['{{DATE_OF_MARRIAGE_OF_PARENTS}}'] && !merged['{{DATE_OF_MARRIAGE}}']) {
    merged['{{DATE_OF_MARRIAGE}}'] = merged['{{DATE_OF_MARRIAGE_OF_PARENTS}}'];
  }

  if (merged['{{PLACE_OF_MARRIAGE}}'] && !merged['{{PLACE_OF_MARRIAGE_OF_PARENTS}}']) {
    merged['{{PLACE_OF_MARRIAGE_OF_PARENTS}}'] = merged['{{PLACE_OF_MARRIAGE}}'];
  } else if (merged['{{PLACE_OF_MARRIAGE_OF_PARENTS}}'] && !merged['{{PLACE_OF_MARRIAGE}}']) {
    merged['{{PLACE_OF_MARRIAGE}}'] = merged['{{PLACE_OF_MARRIAGE_OF_PARENTS}}'];
  }

  if (merged['{{REGISTRY_NUMBER}}'] && !merged['{{REGISTRY_NO}}']) {
    merged['{{REGISTRY_NO}}'] = merged['{{REGISTRY_NUMBER}}'];
  } else if (merged['{{REGISTRY_NO}}'] && !merged['{{REGISTRY_NUMBER}}']) {
    merged['{{REGISTRY_NUMBER}}'] = merged['{{REGISTRY_NO}}'];
  }

  if (merged['{{REGISTRY_DATE}}'] && !merged['{{DATE_OF_REGISTRATION}}']) {
    merged['{{DATE_OF_REGISTRATION}}'] = merged['{{REGISTRY_DATE}}'];
  } else if (merged['{{DATE_OF_REGISTRATION}}'] && !merged['{{REGISTRY_DATE}}']) {
    merged['{{REGISTRY_DATE}}'] = merged['{{DATE_OF_REGISTRATION}}'];
  }

  if (merged['{{CHILD_NAME}}'] && !merged['{{NAME_OF_CHILD}}']) {
    merged['{{NAME_OF_CHILD}}'] = merged['{{CHILD_NAME}}'];
  } else if (merged['{{NAME_OF_CHILD}}'] && !merged['{{CHILD_NAME}}']) {
    merged['{{CHILD_NAME}}'] = merged['{{NAME_OF_CHILD}}'];
  }

  if (merged['{{REMARKS}}'] && !merged['{{REMARKS_TEXT}}']) {
    merged['{{REMARKS_TEXT}}'] = merged['{{REMARKS}}'];
  } else if (merged['{{REMARKS_TEXT}}'] && !merged['{{REMARKS}}']) {
    merged['{{REMARKS}}'] = merged['{{REMARKS_TEXT}}'];
  }

  if (merged['{{VERIFICATION_CODE}}'] && !merged['{{verification_code}}']) {
    merged['{{verification_code}}'] = merged['{{VERIFICATION_CODE}}'];
  } else if (merged['{{verification_code}}'] && !merged['{{VERIFICATION_CODE}}']) {
    merged['{{VERIFICATION_CODE}}'] = merged['{{verification_code}}'];
  }

  if (merged['{{QR_CODE}}'] && !merged['{{qr_code}}']) {
    merged['{{qr_code}}'] = merged['{{QR_CODE}}'];
  } else if (merged['{{qr_code}}'] && !merged['{{QR_CODE}}']) {
    merged['{{QR_CODE}}'] = merged['{{qr_code}}'];
  }

  // Enforce DD MMM YYYY format (e.g. 05 OCTOBER 2026) for all civil registry date placeholders
  const dateTokens = [
    '{{DATE_OF_REGISTRATION}}',
    '{{REGISTRY_DATE}}',
    '{{DATE_OF_BIRTH}}',
    '{{EVENT_DATE}}',
    '{{DATE_OF_MARRIAGE}}',
    '{{DATE_OF_MARRIAGE_OF_PARENTS}}',
    '{{DATE_OF_DEATH}}',
    '{{DATE_ISSUED}}',
    '{{DATE_PAID}}',
    '{{PAYMENT_DATE}}',
  ];
  dateTokens.forEach((tok) => {
    if (merged[tok] && merged[tok] !== 'N/A' && merged[tok] !== '—') {
      merged[tok] = formatDateDDMMMYYYY(merged[tok]);
    }
  });

  Object.entries(merged).forEach(([token, val]) => {
    result = result.split(token).join(val || '');
  });

  // Case-insensitive fallbacks for verification code and qr code
  if (merged['{{VERIFICATION_CODE}}']) {
    result = result.replace(/\{\{verification_code\}\}/gi, merged['{{VERIFICATION_CODE}}']);
  }
  if (merged['{{QR_CODE}}']) {
    result = result.replace(/\{\{qr_code\}\}/gi, merged['{{QR_CODE}}']);
  }

  return result;
}

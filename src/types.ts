export type UserRole = 'superadmin' | 'mcr' | 'admin' | 'clerk' | 'user';

export interface UserPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canIssueCert: boolean;
  canConfigureSettings: boolean;
  canManageUsers: boolean;
  canBackup: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  email: string;
  number: string;
  name: string;
  role: UserRole;
  permissions: UserPermissions;
  isSuperadminInvisible?: boolean;
  createdAt: string;
}

export type RegistryCategory = 'births' | 'marriages' | 'deaths' | 'legal-instruments';

export interface RecordVersion {
  version: number;
  modifiedAt: string;
  modifiedBy: string;
  changesSummary: string;
  snapshot: Record<string, any>;
}

export interface DocumentAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl: string; // Base64 or Blob URL
  uploadedAt: string;
  uploadedBy: string;
}

export interface BaseRegistryRecord {
  id: string;
  category: RegistryCategory;
  bookNumber: string;
  pageNumber: string;
  registryNumber: string;
  registryDate: string;
  remarks: string;
  usernameAdded: string;
  firstAddedDateTime: string;
  updatedAt: string;
  updatedBy: string;
  versions: RecordVersion[];
  pdfAttachment?: DocumentAttachment;
}

export interface BirthRecord extends BaseRegistryRecord {
  category: 'births';
  name: string;
  sex: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  placeOfBirth: string;
  typeOfBirth: 'SINGLE' | 'TWIN' | 'TRIPLET' | 'MULTIPLE';
  birthOrder: string;
  motherMaidenName: string;
  ageAtBirthOfMother: string;
  nationalityOfMother: string;
  religionOfMother: string;
  fatherName: string;
  ageAtBirthOfFather: string;
  nationalityOfFather: string;
  religionOfFather: string;
  dateOfMarriage: string;
  placeOfMarriage: string;
  attendantName?: string;
  attendantTitle?: string;
}

export interface MarriageRecord extends BaseRegistryRecord {
  category: 'marriages';
  dateOfRegistration: string;
  wifeName: string;
  wifeAge: string;
  wifeNationality: string;
  wifeCivilStatus: string;
  wifeResidence: string;
  wifeFatherName: string;
  wifeFatherNationality: string;
  wifeMotherName: string;
  wifeMotherNationality: string;
  wifePersonWhoGiveConsentName: string;
  wifePersonWhoGiveConsentAddress: string;
  wifePersonWhoGiveConsentRelation: string;
  husbandName: string;
  husbandAge: string;
  husbandNationality: string;
  husbandCivilStatus: string;
  husbandResidence: string;
  husbandFatherName: string;
  husbandFatherNationality: string;
  husbandMotherName: string;
  husbandMotherNationality: string;
  husbandPersonWhoGiveConsentName: string;
  husbandPersonWhoGiveConsentAddress: string;
  husbandPersonWhoGiveConsentRelation: string;
  placeOfMarriage: string;
  dateOfMarriage: string;
  timeOfMarriage: string;
  solemnizingOfficer: string;
  solemnizingTitle: string;
  solemnizingAddress: string;
  witness1Name: string;
  witness1Residence: string;
  witness2Name: string;
  witness2Residence: string;
  dateOfReceipt: string;
}

export interface DeathRecord extends BaseRegistryRecord {
  category: 'deaths';
  dateOfRegistration: string;
  nameOfDeceased: string;
  sex: 'MALE' | 'FEMALE';
  ageYears: string;
  ageMonths: string;
  ageDays: string;
  ageHours: string;
  fetalDeath: 'YES' | 'NO';
  civilStatus: string;
  nationality: string;
  usualOccupation: string;
  usualResidence: string;
  dateOfDeathDay: string;
  dateOfDeathMonth: string;
  dateOfDeathYear: string;
  timeOfDeath: string;
  placeOfDeath: string;
  causeOfDeathImmediate: string;
  causeOfDeathUnderlying: string;
  certifyingOfficerName: string;
  certifyingOfficerTitle: string;
}

export interface LegalInstrumentRecord extends BaseRegistryRecord {
  category: 'legal-instruments';
  dateOfRegistration: string;
  typeOfLegalInstrument: string;
  name: string;
}

export type AnyRegistryRecord = BirthRecord | MarriageRecord | DeathRecord | LegalInstrumentRecord;

export type LcrFormType = 'LCR_FORM_1' | 'LCR_FORM_2' | 'LCR_FORM_3';
export type LcrFormLetter = 'A' | 'B' | 'C';

export type CertificateBlockType =
  | 'header'
  | 'logos'
  | 'doc_meta'
  | 'doc_title'
  | 'salutation'
  | 'certification_body'
  | 'particulars_table'
  | 'remarks_annotation'
  | 'purpose_clause'
  | 'signatory'
  | 'qr_verification'
  | 'receipt_footer'
  | 'custom_text';

export interface CertificateLayoutBlock {
  id: string;
  type: CertificateBlockType;
  title: string;
  enabled: boolean;
  order: number;
  customContent?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: 'xs' | 'sm' | 'base' | 'lg';
  fontBold?: boolean;
  paddingTop?: number;
  paddingBottom?: number;
  showBorderBox?: boolean;
}

export interface MunicipalCertificateTemplate {
  id: string;
  formType: LcrFormType; // 'LCR_FORM_1' | 'LCR_FORM_2' | 'LCR_FORM_3'
  formLetter: LcrFormLetter; // 'A' | 'B' | 'C'
  name: string;
  description?: string;
  lastUpdated: string;

  // Header Configuration
  header: {
    countryText: string;
    provincePrefix: string;
    municipalityPrefix: string;
    officeText: string;
    subText?: string;
    showDivider: boolean;
    dividerStyle: 'solid' | 'double' | 'dashed';
    align: 'center' | 'left' | 'right';
  };

  // Logos / Emblems Configuration
  logos: {
    showLeftLogo: boolean;
    leftLogoType: 'municipal' | 'psa' | 'bagong_pilipinas' | 'custom';
    leftLogoUrl?: string;
    showRightLogo: boolean;
    rightLogoType: 'municipal' | 'psa' | 'bagong_pilipinas' | 'custom';
    rightLogoUrl?: string;
    logoSizePx: number; // 40 - 100
  };

  // Watermark / Background Configuration
  watermark: {
    enabled: boolean;
    type: 'seal' | 'text' | 'custom_image';
    text: string;
    imageUrl?: string;
    opacityPercent: number; // 2 - 25
    rotationDegrees: number; // -45 to 45
    sizePx: number; // 200 - 550
    paperTint: 'white' | 'cream' | 'parchment' | 'security_pattern';
  };

  // Footer Configuration
  footer: {
    showReceiptBar: boolean;
    showLegalCitation: boolean;
    legalCitationText: string;
    sealNoticeText: string;
    showVerifierCode: boolean;
    customFooterNote?: string;
  };

  // Drag & Drop Layout Blocks
  blocks: CertificateLayoutBlock[];

  // Freeform WYSIWYG Document Mode (Optional)
  editorMode?: 'blocks' | 'wysiwyg';
  freeformHtml?: string;
  customBackgroundUrl?: string;
  backgroundOpacityPercent?: number;
}

export interface IssuedCertification {
  id: string;
  certNumber: string;
  formType: LcrFormType;
  formLetter: LcrFormLetter;
  category: RegistryCategory;
  recordId?: string;
  personName: string;
  spouseOrParentName?: string;
  eventDate?: string;
  eventPlace?: string;
  bookNumber?: string;
  pageNumber?: string;
  registryNumber?: string;
  reasonOrDetails: string;
  requestedBy: string;
  purpose: string;
  orNumber: string;
  amountPaid: string;
  dateIssued: string;
  issuedByUsername: string;
  mcrOfficerName: string;
  mcrOfficerTitle: string;
  verifierName?: string;
  verifierTitle?: string;
  verificationCode: string;
  createdAt: string;
  // Extended fields to retain 100% of details in database & PDF export
  sex?: string;
  motherName?: string;
  motherCitizenship?: string;
  fatherName?: string;
  fatherCitizenship?: string;
  dateOfMarriage?: string;
  placeOfMarriage?: string;
  registryDate?: string;
  renderedHtml?: string;
  customBackgroundUrl?: string;
  backgroundOpacityPercent?: number;
}

export interface McrStaffMember {
  id: string;
  name: string;
  title: string;
  isDefault?: boolean;
}

export interface SiteSettings {
  lguName: string;
  province: string;
  municipality: string;
  officeName: string;
  mcrOfficerName: string;
  mcrOfficerTitle: string;
  assistantMcrName: string;
  assistantMcrTitle: string;
  mcrStaff?: McrStaffMember[];
  defaultOrFee: string;
  sealText: string;
  geminiApiKey?: string;
  contactEmail: string;
  contactPhone: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  username: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ISSUE_CERT' | 'SETTINGS' | 'BACKUP' | 'LOGIN' | 'LOGOUT';
  category?: RegistryCategory | 'SYSTEM' | 'CERTIFICATION' | 'AUTH';
  targetId?: string;
  description: string;
}

export type PersonnelRole = 'doctor' | 'nurse' | 'midwife' | 'mcr' | 'solemnizing_officer' | 'other';

export interface PersonnelMemoryItem {
  id: string;
  name: string;
  designation: string;
  roleType: PersonnelRole;
  addressOrAffiliation?: string;
  licenseNumber?: string;
  usageCount?: number;
  lastUsedAt?: string;
}

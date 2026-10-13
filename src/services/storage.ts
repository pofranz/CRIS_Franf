import {
  UserAccount,
  BirthRecord,
  MarriageRecord,
  DeathRecord,
  LegalInstrumentRecord,
  AnyRegistryRecord,
  IssuedCertification,
  SiteSettings,
  AuditLogItem,
  RegistryCategory,
  PersonnelMemoryItem,
  PersonnelRole,
  MunicipalCertificateTemplate,
  LcrFormType,
  LcrFormLetter,
  CrisNotification,
  NotificationType,
  NotificationPriority,
  UserRole,
  MonthlyRevenueData,
  YearlyRevenueData,
  RevenueSummaryMetrics,
  MiscellaneousRevenueRecord,
  CrisRevenueItem,
} from '../types';
import { createDefaultTemplate } from './templates';
import { cloudSyncService } from './cloudSync';
import { formatDateDDMMMYYYY, formatDateTimeDDMMMYYYY } from '../utils/dateUtils';

// Sample dummy PDF (Base64 of a minimal valid PDF)
export const SAMPLE_CIVIL_REGISTRY_PDF =
  'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgNSAwIFIKPj4KPj4KZW5kb2JqCjUgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCAyNzQKPj4Kc3RyZWFtCkJUCi9GMSAxNCBUZgoxMDAgNzUwIFRkCihSRVBVQkxJQyBPRiBUSEUgUEhJTElQUElORVMpIFRqCjAgLTIwIFRkCihPRkZJQ0UgT0YgVEhFIE1VTklDSVBBTCBDSVZJTCBSRUdJU1RSQVIpIFRqCjAgLTMwIFRkCi9GMSAxMiBUZgooT0ZGSUNJQUwgQ0lWSUwgUkVHSVNUUlkgQk9PSyBSRUNPUkQgU0NBTikgVGoKMCAtMjUgVGYKKFJlZ2lzdHJ5IEJvb2sgRG9jdW1lbnQgdmVyaWZpZWQgYW5kIGFyY2hpdmVkIGluIENSVVMpIFRqCjAgLTIwIFRkCihUaGlzIGlzIGEgcHJvdmlzaW9uZWQgc2FtcGxlIHNjYW5uZWQgZG9jdW1lbnQgbGlua2VkIHRvIGluZGV4LikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAowMDAwMDAwMjg5IDAwMDAwIG4gCjAwMDAwMDAyMTkgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgowMDAwMDAwNjE1CiUlRU9G';

const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-superadmin',
    username: 'superadmin',
    password: 'password123',
    email: 'fjp.culaba@gmail.com',
    number: '09557213860',
    name: 'Francis Jeff Po',
    role: 'superadmin',
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canIssueCert: true,
      canConfigureSettings: true,
      canManageUsers: true,
      canBackup: true,
    },
    isSuperadminInvisible: true,
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'usr-mcr',
    username: 'mcr_admin',
    password: 'password123',
    email: 'mcr@culaba.gov.ph',
    number: '09171234567',
    name: 'HON. ATTY. ROBERTO G. MENDOZA',
    role: 'mcr',
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canIssueCert: true,
      canConfigureSettings: true,
      canManageUsers: true,
      canBackup: true,
    },
    isSuperadminInvisible: false,
    createdAt: '2026-01-02T08:00:00.000Z',
  },
  {
    id: 'usr-clerk',
    username: 'clerk_maria',
    password: 'password123',
    email: 'maria.santos@culaba.gov.ph',
    number: '09281234567',
    name: 'MARIA CRISTINA SANTOS',
    role: 'clerk',
    permissions: {
      canCreate: true,
      canEdit: true,
      canDelete: false, // Clerk CANNOT delete
      canIssueCert: true,
      canConfigureSettings: false,
      canManageUsers: false,
      canBackup: false,
    },
    isSuperadminInvisible: false,
    createdAt: '2026-01-03T08:00:00.000Z',
  },
];

const INITIAL_SETTINGS: SiteSettings = {
  lguName: 'MUNICIPALITY OF CULABA',
  province: 'BILIRAN',
  municipality: 'CULABA',
  officeName: 'OFFICE OF THE MUNICIPAL CIVIL REGISTRAR',
  mcrOfficerName: 'FRANCIS JEFF C. PO, MCR',
  mcrOfficerTitle: 'Municipal Civil Registrar',
  assistantMcrName: 'MARIA CRISTINA SANTOS',
  assistantMcrTitle: 'Registration Officer II / Assistant MCR',
  mcrStaff: [
    {
      id: 'staff-igmedio',
      name: 'IGMEDIO JR. S. TABON',
      title: 'RCO - II',
      isDefault: true,
    },
  ],
  defaultOrFee: '150.00',
  sealText: 'OFFICIAL SEAL - MUNICIPALITY OF CULABA - CIVIL REGISTRY',
  contactEmail: 'mcr@culaba.gov.ph',
  contactPhone: '(053) 564-1000',
};

const INITIAL_BIRTHS: BirthRecord[] = [
  {
    id: 'birth-2026-001',
    category: 'births',
    bookNumber: '54',
    pageNumber: '112',
    registryNumber: '2026-0045',
    registryDate: '2026-02-14',
    name: 'JUAN MIGUEL DELA CRUZ PO',
    sex: 'MALE',
    dateOfBirth: '2026-02-10',
    placeOfBirth: 'CULABA RURAL HEALTH UNIT, CULABA, BILIRAN',
    typeOfBirth: 'SINGLE',
    birthOrder: 'FIRST',
    motherMaidenName: 'ELENA SANTOS DELA CRUZ',
    ageAtBirthOfMother: '28',
    nationalityOfMother: 'FILIPINO',
    religionOfMother: 'ROMAN CATHOLIC',
    fatherName: 'RAMON TANGKAP PO',
    ageAtBirthOfFather: '31',
    nationalityOfFather: 'FILIPINO',
    religionOfFather: 'ROMAN CATHOLIC',
    dateOfMarriage: '2024-06-18',
    placeOfMarriage: 'ST. ROQUE PARISH CHURCH, CULABA, BILIRAN',
    remarks: 'LEGITIMATE CHILD. TIMELY REGISTRATION. COMPLETE MEDICAL ATTENDANCE.',
    usernameAdded: 'superadmin',
    firstAddedDateTime: '2026-02-14 09:30:00',
    updatedAt: '2026-02-14 09:30:00',
    updatedBy: 'superadmin',
    versions: [
      {
        version: 1,
        modifiedAt: '2026-02-14 09:30:00',
        modifiedBy: 'superadmin',
        changesSummary: 'INITIAL INDEX ENTRY CREATION',
        snapshot: {},
      },
    ],
    pdfAttachment: {
      name: 'BIRTH_BOOK54_PAGE112_REG2026-0045.pdf',
      size: 142850,
      type: 'application/pdf',
      dataUrl: SAMPLE_CIVIL_REGISTRY_PDF,
      uploadedAt: '2026-02-14 09:32:00',
      uploadedBy: 'superadmin',
    },
  },
  {
    id: 'birth-2026-002',
    category: 'births',
    bookNumber: '54',
    pageNumber: '115',
    registryNumber: '2026-0046',
    registryDate: '2026-02-18',
    name: 'BEATRICE JOYCE VELASCO TAN',
    sex: 'FEMALE',
    dateOfBirth: '2026-02-15',
    placeOfBirth: 'BILIRAN PROVINCIAL HOSPITAL, NAVAL, BILIRAN',
    typeOfBirth: 'SINGLE',
    birthOrder: 'SECOND',
    motherMaidenName: 'CARMEN REYES VELASCO',
    ageAtBirthOfMother: '26',
    nationalityOfMother: 'FILIPINO',
    religionOfMother: 'ROMAN CATHOLIC',
    fatherName: 'RICARDO ESPINA TAN',
    ageAtBirthOfFather: '29',
    nationalityOfFather: 'FILIPINO',
    religionOfFather: 'ROMAN CATHOLIC',
    dateOfMarriage: '2023-01-15',
    placeOfMarriage: 'NAVAL CATHEDRAL, NAVAL, BILIRAN',
    remarks: 'REGISTERED UNDER AFFIDAVIT OF PARENTS. LEGITIMATE.',
    usernameAdded: 'clerk_maria',
    firstAddedDateTime: '2026-02-18 14:15:00',
    updatedAt: '2026-02-18 14:15:00',
    updatedBy: 'clerk_maria',
    versions: [
      {
        version: 1,
        modifiedAt: '2026-02-18 14:15:00',
        modifiedBy: 'clerk_maria',
        changesSummary: 'INITIAL ENTRY CREATED BY REGISTRATION CLERK',
        snapshot: {},
      },
    ],
    pdfAttachment: {
      name: 'BIRTH_REG_2026-0046_SCANNED_PAGE.pdf',
      size: 182400,
      type: 'application/pdf',
      dataUrl: SAMPLE_CIVIL_REGISTRY_PDF,
      uploadedAt: '2026-02-18 14:17:00',
      uploadedBy: 'clerk_maria',
    },
  },
];

const INITIAL_MARRIAGES: MarriageRecord[] = [
  {
    id: 'marriage-2026-001',
    category: 'marriages',
    bookNumber: '32',
    pageNumber: '048',
    registryNumber: '2026-0012',
    registryDate: '2026-01-20',
    dateOfRegistration: '2026-01-20',
    wifeName: 'MA. KRISTINA ALVAREZ BAUTISTA',
    wifeAge: '27',
    wifeNationality: 'FILIPINO',
    wifeCivilStatus: 'SINGLE',
    wifeResidence: 'BARANGAY GUINDAPUNAN, CULABA, BILIRAN',
    wifeFatherName: 'RODOLFO M. BAUTISTA',
    wifeFatherNationality: 'FILIPINO',
    wifeMotherName: 'TERESA L. ALVAREZ',
    wifeMotherNationality: 'FILIPINO',
    wifePersonWhoGiveConsentName: 'N/A OF LEGAL AGE',
    wifePersonWhoGiveConsentAddress: 'N/A',
    wifePersonWhoGiveConsentRelation: 'N/A',
    husbandName: 'EDGARDO JOSE CORNELIO MERCADO',
    husbandAge: '29',
    husbandNationality: 'FILIPINO',
    husbandCivilStatus: 'SINGLE',
    husbandResidence: 'BARANGAY POBLACION, CULABA, BILIRAN',
    husbandFatherName: 'JOSEPH V. MERCADO',
    husbandFatherNationality: 'FILIPINO',
    husbandMotherName: 'ANTONIA D. CORNELIO',
    husbandMotherNationality: 'FILIPINO',
    husbandPersonWhoGiveConsentName: 'N/A OF LEGAL AGE',
    husbandPersonWhoGiveConsentAddress: 'N/A',
    husbandPersonWhoGiveConsentRelation: 'N/A',
    placeOfMarriage: 'MUNICIPAL TRIAL COURT, CULABA, BILIRAN',
    dateOfMarriage: '2026-01-18',
    timeOfMarriage: '10:00 AM',
    solemnizingOfficer: 'HON. JUDGE ALFONSO T. SERAFIN',
    solemnizingTitle: 'ACTING PRESIDING JUDGE, MTC',
    solemnizingAddress: 'HALL OF JUSTICE, CULABA, BILIRAN',
    witness1Name: 'ATTY. GERARDO A. LIM',
    witness1Residence: 'CULABA, BILIRAN',
    witness2Name: 'DR. MARITA C. CASTRO',
    witness2Residence: 'NAVAL, BILIRAN',
    dateOfReceipt: '2026-01-20',
    remarks: 'MARRIAGE LICENSE NO. ML-2026-0089 ISSUED AT CULABA, BILIRAN.',
    usernameAdded: 'superadmin',
    firstAddedDateTime: '2026-01-20 11:30:00',
    updatedAt: '2026-01-20 11:30:00',
    updatedBy: 'superadmin',
    versions: [
      {
        version: 1,
        modifiedAt: '2026-01-20 11:30:00',
        modifiedBy: 'superadmin',
        changesSummary: 'INITIAL MARRIAGE CONTRACT REGISTRATION',
        snapshot: {},
      },
    ],
    pdfAttachment: {
      name: 'MARRIAGE_BOOK32_PAGE048_2026-0012.pdf',
      size: 198200,
      type: 'application/pdf',
      dataUrl: SAMPLE_CIVIL_REGISTRY_PDF,
      uploadedAt: '2026-01-20 11:35:00',
      uploadedBy: 'superadmin',
    },
  },
];

const INITIAL_DEATHS: DeathRecord[] = [
  {
    id: 'death-2026-001',
    category: 'deaths',
    bookNumber: '28',
    pageNumber: '077',
    registryNumber: '2026-0009',
    registryDate: '2026-02-05',
    dateOfRegistration: '2026-02-05',
    nameOfDeceased: 'AURELIO MARCELO SALVADOR SR.',
    sex: 'MALE',
    ageYears: '74',
    ageMonths: '5',
    ageDays: '12',
    ageHours: '0',
    fetalDeath: 'NO',
    civilStatus: 'MARRIED',
    nationality: 'FILIPINO',
    usualOccupation: 'FARMER / RETIRED',
    usualResidence: 'BARANGAY SALVACION, CULABA, BILIRAN',
    dateOfDeathDay: '03',
    dateOfDeathMonth: '02',
    dateOfDeathYear: '2026',
    timeOfDeath: '04:30 AM',
    placeOfDeath: 'RESIDENCE, BRGY. SALVACION, CULABA, BILIRAN',
    causeOfDeathImmediate: 'ACUTE MYOCARDIAL INFARCTION',
    causeOfDeathUnderlying: 'HYPERTENSIVE CARDIOVASCULAR DISEASE',
    certifyingOfficerName: 'DR. FELIPE D. CATINDIG, M.D.',
    certifyingOfficerTitle: 'MUNICIPAL HEALTH OFFICER',
    remarks: 'ATTENDED BY MUNICIPAL HEALTH OFFICER. TIMELY REGISTRATION.',
    usernameAdded: 'clerk_maria',
    firstAddedDateTime: '2026-02-05 10:00:00',
    updatedAt: '2026-02-05 10:00:00',
    updatedBy: 'clerk_maria',
    versions: [
      {
        version: 1,
        modifiedAt: '2026-02-05 10:00:00',
        modifiedBy: 'clerk_maria',
        changesSummary: 'INITIAL CERTIFICATE OF DEATH ENTRY',
        snapshot: {},
      },
    ],
    pdfAttachment: {
      name: 'DEATH_REG_BOOK28_PAGE077.pdf',
      size: 165400,
      type: 'application/pdf',
      dataUrl: SAMPLE_CIVIL_REGISTRY_PDF,
      uploadedAt: '2026-02-05 10:05:00',
      uploadedBy: 'clerk_maria',
    },
  },
];

const INITIAL_LEGAL_INSTRUMENTS: LegalInstrumentRecord[] = [
  {
    id: 'legal-2026-001',
    category: 'legal-instruments',
    bookNumber: '12',
    pageNumber: '021',
    registryNumber: '2026-LI-0004',
    registryDate: '2026-02-12',
    dateOfRegistration: '2026-02-12',
    typeOfLegalInstrument: 'AFFIDAVIT OF LEGITIMATION BY SUBSEQUENT MARRIAGE',
    name: 'MIGUEL ANGEL CORDOVA PO',
    orNumber: 'OR-892150',
    amountPaid: '200.00',
    remarks: 'PARENTS SUBSEQUENTLY MARRIED ON JAN 15, 2026 AT CULABA, BILIRAN. REGISTERED ACCORDING TO ART. 177 FAMILY CODE.',
    usernameAdded: 'superadmin',
    firstAddedDateTime: '2026-02-12 16:00:00',
    updatedAt: '2026-02-12 16:00:00',
    updatedBy: 'superadmin',
    versions: [
      {
        version: 1,
        modifiedAt: '2026-02-12 16:00:00',
        modifiedBy: 'superadmin',
        changesSummary: 'INITIAL ENTRY OF LEGAL INSTRUMENT',
        snapshot: {},
      },
    ],
    pdfAttachment: {
      name: 'AFFIDAVIT_OF_LEGITIMATION_2026-LI-0004.pdf',
      size: 177300,
      type: 'application/pdf',
      dataUrl: SAMPLE_CIVIL_REGISTRY_PDF,
      uploadedAt: '2026-02-12 16:05:00',
      uploadedBy: 'superadmin',
    },
  },
  {
    id: 'legal-2026-002',
    category: 'legal-instruments',
    bookNumber: '12',
    pageNumber: '035',
    registryNumber: '2026-LI-0012',
    registryDate: '2026-10-08',
    dateOfRegistration: '2026-10-08',
    typeOfLegalInstrument: 'AFFIDAVIT TO USE THE SURNAME OF THE FATHER (AUSF)',
    name: 'JASPER NATHANIEL DELA CRUZ PO',
    orNumber: 'OR-892308',
    amountPaid: '250.00',
    remarks: 'EXECUTED PURSUANT TO R.A. 9255 WITH SUPPORTING NOTARIZED ACKNOWLEDGMENT OF PATERNITY.',
    usernameAdded: 'superadmin',
    firstAddedDateTime: '2026-10-08 11:20:00',
    updatedAt: '2026-10-08 11:20:00',
    updatedBy: 'superadmin',
    versions: [
      {
        version: 1,
        modifiedAt: '2026-10-08 11:20:00',
        modifiedBy: 'superadmin',
        changesSummary: 'INITIAL AUSF FILING',
        snapshot: {},
      },
    ],
    pdfAttachment: {
      name: 'AUSF_RECORD_2026-LI-0012.pdf',
      size: 165400,
      type: 'application/pdf',
      dataUrl: SAMPLE_CIVIL_REGISTRY_PDF,
      uploadedAt: '2026-10-08 11:25:00',
      uploadedBy: 'superadmin',
    },
  },
  {
    id: 'legal-2026-003',
    category: 'legal-instruments',
    bookNumber: '12',
    pageNumber: '028',
    registryNumber: '2026-LI-0009',
    registryDate: '2026-09-22',
    dateOfRegistration: '2026-09-22',
    typeOfLegalInstrument: 'COURT DECREE / ORDER OF ADOPTION',
    name: 'SOPHIA ISABELLE RAMOS',
    orNumber: 'OR-892207',
    amountPaid: '300.00',
    remarks: 'REGIONAL TRIAL COURT BRANCH 11 DECREE OF DOMESTIC ADOPTION FINAL AND EXECUTORY.',
    usernameAdded: 'mcr_admin',
    firstAddedDateTime: '2026-09-22 14:10:00',
    updatedAt: '2026-09-22 14:10:00',
    updatedBy: 'mcr_admin',
    versions: [
      {
        version: 1,
        modifiedAt: '2026-09-22 14:10:00',
        modifiedBy: 'mcr_admin',
        changesSummary: 'COURT ADOPTION RECORDING',
        snapshot: {},
      },
    ],
  },
];

const INITIAL_CERTIFICATIONS: IssuedCertification[] = [
  // Current Month: October 2026 (Resets 1st day of month)
  {
    id: 'cert-2026-1001',
    certNumber: 'CUL-2026-892301-1A',
    formType: 'LCR_FORM_1',
    formLetter: 'A',
    category: 'births',
    recordId: 'birth-2026-001',
    personName: 'JUAN MIGUEL DELA CRUZ PO',
    spouseOrParentName: 'RAMON TANGKAP PO / ELENA SANTOS DELA CRUZ',
    eventDate: '2026-02-10',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '54',
    pageNumber: '112',
    registryNumber: '2026-0045',
    reasonOrDetails: 'AVAILABLE AND FOUND IN CIVIL REGISTRY BOOK NO. 54, PAGE 112.',
    requestedBy: 'RAMON TANGKAP PO',
    purpose: 'PASSPORT AND DFA REQUIREMENTS',
    orNumber: 'OR-892301',
    amountPaid: '150.00',
    dateIssued: '2026-10-12',
    issuedByUsername: 'superadmin',
    mcrOfficerName: 'FRANCIS JEFF C. PO, MCR',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8923-A1',
    createdAt: '2026-10-12T09:15:00.000Z',
  },
  {
    id: 'cert-2026-1002',
    certNumber: 'CUL-2026-892302-3A',
    formType: 'LCR_FORM_3',
    formLetter: 'A',
    category: 'marriages',
    recordId: 'marr-2026-001',
    personName: 'EDUARDO V. SANTOS & MARIA CLARA REYES',
    eventDate: '2026-01-18',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '32',
    pageNumber: '045',
    registryNumber: '2026-0012',
    reasonOrDetails: 'AVAILABLE AND RECORDED IN MARRIAGE REGISTER BOOK NO. 32.',
    requestedBy: 'MARIA CLARA REYES',
    purpose: 'SPOUSAL VISA AND IMMIGRATION FILING',
    orNumber: 'OR-892302',
    amountPaid: '200.00',
    dateIssued: '2026-10-09',
    issuedByUsername: 'mcr_admin',
    mcrOfficerName: 'HON. ATTY. ROBERTO G. MENDOZA',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8923-A2',
    createdAt: '2026-10-09T14:20:00.000Z',
  },
  {
    id: 'cert-2026-1003',
    certNumber: 'CUL-2026-892303-2A',
    formType: 'LCR_FORM_2',
    formLetter: 'A',
    category: 'deaths',
    recordId: 'death-2026-001',
    personName: 'DON VICENTE MONTECILLO GARCIA',
    eventDate: '2026-02-05',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '19',
    pageNumber: '088',
    registryNumber: '2026-0028',
    reasonOrDetails: 'DEATH CERTIFICATE VERIFIED AND REGISTERED.',
    requestedBy: 'CARMEN MONTECILLO',
    purpose: 'ESTATE SETTLEMENT AND SSS PENSION CLAIM',
    orNumber: 'OR-892303',
    amountPaid: '150.00',
    dateIssued: '2026-10-05',
    issuedByUsername: 'clerk_culaba',
    mcrOfficerName: 'FRANCIS JEFF C. PO, MCR',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8923-A3',
    createdAt: '2026-10-05T10:45:00.000Z',
  },
  {
    id: 'cert-2026-1004',
    certNumber: 'CUL-2026-892304-1A',
    formType: 'LCR_FORM_1',
    formLetter: 'A',
    category: 'births',
    personName: 'ANGELICA MAE CORDOVA',
    eventDate: '2026-03-14',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '54',
    pageNumber: '118',
    registryNumber: '2026-0052',
    reasonOrDetails: 'AVAILABLE AND FOUND IN BIRTH REGISTER.',
    requestedBy: 'ANGELICA MAE CORDOVA',
    purpose: 'EMPLOYMENT REQUIREMENT',
    orNumber: 'OR-892304',
    amountPaid: '150.00',
    dateIssued: '2026-10-02',
    issuedByUsername: 'superadmin',
    mcrOfficerName: 'FRANCIS JEFF C. PO, MCR',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8923-A4',
    createdAt: '2026-10-02T11:00:00.000Z',
  },
  // Previous Months of 2026
  {
    id: 'cert-2026-0901',
    certNumber: 'CUL-2026-892201-1A',
    formType: 'LCR_FORM_1',
    formLetter: 'A',
    category: 'births',
    personName: 'GABRIEL L. NAVARRO',
    eventDate: '2026-08-20',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '54',
    pageNumber: '105',
    registryNumber: '2026-0041',
    reasonOrDetails: 'AVAILABLE AND RECORDED.',
    requestedBy: 'LUCIA NAVARRO',
    purpose: 'SCHOOL ENROLLMENT',
    orNumber: 'OR-892201',
    amountPaid: '150.00',
    dateIssued: '2026-09-24',
    issuedByUsername: 'clerk_culaba',
    mcrOfficerName: 'FRANCIS JEFF C. PO, MCR',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8922-A1',
    createdAt: '2026-09-24T09:00:00.000Z',
  },
  {
    id: 'cert-2026-0902',
    certNumber: 'CUL-2026-892202-3A',
    formType: 'LCR_FORM_3',
    formLetter: 'A',
    category: 'marriages',
    personName: 'ARTHUR T. LIM & JOCELYN P. TAN',
    eventDate: '2026-08-15',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '32',
    pageNumber: '040',
    registryNumber: '2026-0010',
    reasonOrDetails: 'AVAILABLE AND REGISTERED.',
    requestedBy: 'ARTHUR T. LIM',
    purpose: 'LOAN APPLICATION & GSIS',
    orNumber: 'OR-892202',
    amountPaid: '200.00',
    dateIssued: '2026-09-15',
    issuedByUsername: 'mcr_admin',
    mcrOfficerName: 'HON. ATTY. ROBERTO G. MENDOZA',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8922-A2',
    createdAt: '2026-09-15T13:30:00.000Z',
  },
  {
    id: 'cert-2026-0903',
    certNumber: 'CUL-2026-892203-1B',
    formType: 'LCR_FORM_1',
    formLetter: 'B',
    category: 'births',
    personName: 'RODRIGO V. SANDOVAL',
    eventDate: '1965-04-12',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '12',
    pageNumber: 'N/A',
    registryNumber: 'N/A',
    reasonOrDetails: 'CERTIFICATE OF NON-AVAILABILITY / NEGATIVE CERTIFICATION ISSUED.',
    requestedBy: 'RODRIGO V. SANDOVAL',
    purpose: 'LATE REGISTRATION OF BIRTH APPLICATION',
    orNumber: 'OR-892203',
    amountPaid: '150.00',
    dateIssued: '2026-09-08',
    issuedByUsername: 'superadmin',
    mcrOfficerName: 'FRANCIS JEFF C. PO, MCR',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8922-B1',
    createdAt: '2026-09-08T10:15:00.000Z',
  },
  {
    id: 'cert-2026-0801',
    certNumber: 'CUL-2026-892101-1A',
    formType: 'LCR_FORM_1',
    formLetter: 'A',
    category: 'births',
    personName: 'BIANCA SOFIA ALCANTARA',
    eventDate: '2026-07-11',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '54',
    pageNumber: '098',
    registryNumber: '2026-0038',
    reasonOrDetails: 'AVAILABLE AND FOUND IN CIVIL REGISTRY BOOK.',
    requestedBy: 'SOFIA ALCANTARA',
    purpose: 'TRAVEL CLEARANCE',
    orNumber: 'OR-892101',
    amountPaid: '150.00',
    dateIssued: '2026-08-28',
    issuedByUsername: 'superadmin',
    mcrOfficerName: 'FRANCIS JEFF C. PO, MCR',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8921-A1',
    createdAt: '2026-08-28T14:00:00.000Z',
  },
  {
    id: 'cert-2026-0802',
    certNumber: 'CUL-2026-892102-2A',
    formType: 'LCR_FORM_2',
    formLetter: 'A',
    category: 'deaths',
    personName: 'BENEDICTO F. MORALES',
    eventDate: '2026-07-25',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '19',
    pageNumber: '079',
    registryNumber: '2026-0022',
    reasonOrDetails: 'RECORD AVAILABLE IN DEATH REGISTER.',
    requestedBy: 'FELICIDAD MORALES',
    purpose: 'BENEFIT CLAIMS',
    orNumber: 'OR-892102',
    amountPaid: '150.00',
    dateIssued: '2026-08-14',
    issuedByUsername: 'clerk_culaba',
    mcrOfficerName: 'FRANCIS JEFF C. PO, MCR',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8921-A2',
    createdAt: '2026-08-14T09:30:00.000Z',
  },
  {
    id: 'cert-2026-0701',
    certNumber: 'CUL-2026-892001-1A',
    formType: 'LCR_FORM_1',
    formLetter: 'A',
    category: 'births',
    personName: 'JOSHUA RYAN CABRERA',
    eventDate: '2026-06-19',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '54',
    pageNumber: '085',
    registryNumber: '2026-0032',
    reasonOrDetails: 'AVAILABLE AND CONFIRMED.',
    requestedBy: 'MARILOU CABRERA',
    purpose: 'PASSPORT APPLICATION',
    orNumber: 'OR-892001',
    amountPaid: '150.00',
    dateIssued: '2026-07-21',
    issuedByUsername: 'superadmin',
    mcrOfficerName: 'FRANCIS JEFF C. PO, MCR',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8920-A1',
    createdAt: '2026-07-21T11:15:00.000Z',
  },
  {
    id: 'cert-2026-0601',
    certNumber: 'CUL-2026-891901-3A',
    formType: 'LCR_FORM_3',
    formLetter: 'A',
    category: 'marriages',
    personName: 'MARK ANTHONY RIVERA & KATHLEEN ROSE DIZON',
    eventDate: '2026-05-18',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '32',
    pageNumber: '031',
    registryNumber: '2026-0008',
    reasonOrDetails: 'RECORD VERIFIED AND AUTHENTICATED.',
    requestedBy: 'MARK ANTHONY RIVERA',
    purpose: 'PHILHEALTH SPOUSAL ENROLLMENT',
    orNumber: 'OR-891901',
    amountPaid: '200.00',
    dateIssued: '2026-06-16',
    issuedByUsername: 'mcr_admin',
    mcrOfficerName: 'HON. ATTY. ROBERTO G. MENDOZA',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8919-A1',
    createdAt: '2026-06-16T15:00:00.000Z',
  },
  {
    id: 'cert-2026-0501',
    certNumber: 'CUL-2026-891801-1A',
    formType: 'LCR_FORM_1',
    formLetter: 'A',
    category: 'births',
    personName: 'CHLOE MARIE ESPERANZA',
    eventDate: '2026-04-10',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '54',
    pageNumber: '072',
    registryNumber: '2026-0025',
    reasonOrDetails: 'FOUND IN BIRTH REGISTER BOOK NO. 54.',
    requestedBy: 'DANILO ESPERANZA',
    purpose: 'CIVIL IDENTIFICATION CARD',
    orNumber: 'OR-891801',
    amountPaid: '150.00',
    dateIssued: '2026-05-19',
    issuedByUsername: 'clerk_culaba',
    mcrOfficerName: 'FRANCIS JEFF C. PO, MCR',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8918-A1',
    createdAt: '2026-05-19T09:40:00.000Z',
  },
  {
    id: 'cert-2026-0401',
    certNumber: 'CUL-2026-891701-1A',
    formType: 'LCR_FORM_1',
    formLetter: 'A',
    category: 'births',
    personName: 'DANIEL JOSE OCAMPO',
    eventDate: '2026-03-02',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '54',
    pageNumber: '061',
    registryNumber: '2026-0019',
    reasonOrDetails: 'AVAILABLE AND FOUND.',
    requestedBy: 'DANIEL JOSE OCAMPO',
    purpose: 'BOARD EXAM PRC APPLICATION',
    orNumber: 'OR-891701',
    amountPaid: '150.00',
    dateIssued: '2026-04-14',
    issuedByUsername: 'superadmin',
    mcrOfficerName: 'FRANCIS JEFF C. PO, MCR',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8917-A1',
    createdAt: '2026-04-14T10:10:00.000Z',
  },
  {
    id: 'cert-2026-0301',
    certNumber: 'CUL-2026-891601-3A',
    formType: 'LCR_FORM_3',
    formLetter: 'A',
    category: 'marriages',
    personName: 'FERNANDO G. VALDEZ & LILIAN S. FLORES',
    eventDate: '2026-02-14',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '32',
    pageNumber: '022',
    registryNumber: '2026-0005',
    reasonOrDetails: 'MARRIAGE CERTIFICATE ISSUED.',
    requestedBy: 'FERNANDO G. VALDEZ',
    purpose: 'HOUSING LOAN PAG-IBIG',
    orNumber: 'OR-891601',
    amountPaid: '200.00',
    dateIssued: '2026-03-20',
    issuedByUsername: 'mcr_admin',
    mcrOfficerName: 'HON. ATTY. ROBERTO G. MENDOZA',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8916-A1',
    createdAt: '2026-03-20T14:30:00.000Z',
  },
  {
    id: 'cert-2026-0201',
    certNumber: 'CERT-2026-0082',
    formType: 'LCR_FORM_1',
    formLetter: 'A',
    category: 'births',
    recordId: 'birth-2026-001',
    personName: 'JUAN MIGUEL DELA CRUZ PO',
    spouseOrParentName: 'RAMON TANGKAP PO / ELENA SANTOS DELA CRUZ',
    eventDate: '2026-02-10',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '54',
    pageNumber: '112',
    registryNumber: '2026-0045',
    reasonOrDetails: 'AVAILABLE AND FOUND IN CIVIL REGISTRY BOOK NO. 54, PAGE 112.',
    requestedBy: 'RAMON TANGKAP PO',
    purpose: 'PASSPORT AND SCHOOL ADMISSION APPLICATION',
    orNumber: 'OR-892145',
    amountPaid: '150.00',
    dateIssued: '2026-02-16',
    issuedByUsername: 'superadmin',
    mcrOfficerName: 'FRANCIS JEFF C. PO, MCR',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8921-A1',
    createdAt: '2026-02-16T10:30:00.000Z',
  },
  {
    id: 'cert-2026-0101',
    certNumber: 'CUL-2026-891401-1A',
    formType: 'LCR_FORM_1',
    formLetter: 'A',
    category: 'births',
    personName: 'KRISTINE JOYCE VILLANUEVA',
    eventDate: '2026-01-04',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '54',
    pageNumber: '034',
    registryNumber: '2026-0003',
    reasonOrDetails: 'AVAILABLE IN BIRTH REGISTRY BOOK.',
    requestedBy: 'HERMINIA VILLANUEVA',
    purpose: 'PHILHEALTH AND MATERNITY CLAIMS',
    orNumber: 'OR-891401',
    amountPaid: '150.00',
    dateIssued: '2026-01-22',
    issuedByUsername: 'superadmin',
    mcrOfficerName: 'FRANCIS JEFF C. PO, MCR',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2026-8914-A1',
    createdAt: '2026-01-22T08:50:00.000Z',
  },
  // Previous Year: 2025 Historical Records (Yearly Comparison)
  {
    id: 'cert-2025-1201',
    certNumber: 'CUL-2025-789012-1A',
    formType: 'LCR_FORM_1',
    formLetter: 'A',
    category: 'births',
    personName: 'DOMINIC RAFAEL SERRANO',
    eventDate: '2025-11-20',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '53',
    pageNumber: '190',
    registryNumber: '2025-0145',
    reasonOrDetails: 'AVAILABLE AND FOUND IN ARCHIVE.',
    requestedBy: 'RAFAEL SERRANO',
    purpose: 'TRAVEL DOCUMENTS',
    orNumber: 'OR-789012',
    amountPaid: '150.00',
    dateIssued: '2025-12-18',
    issuedByUsername: 'superadmin',
    mcrOfficerName: 'FRANCIS JEFF C. PO, MCR',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2025-7890-A1',
    createdAt: '2025-12-18T10:00:00.000Z',
  },
  {
    id: 'cert-2025-1101',
    certNumber: 'CUL-2025-788910-3A',
    formType: 'LCR_FORM_3',
    formLetter: 'A',
    category: 'marriages',
    personName: 'ROLANDO P. MENDOZA & GLORIA T. BUSTAMANTE',
    eventDate: '2025-10-15',
    eventPlace: 'CULABA, BILIRAN',
    bookNumber: '31',
    pageNumber: '088',
    registryNumber: '2025-0044',
    reasonOrDetails: 'AVAILABLE IN MARRIAGE REGISTER.',
    requestedBy: 'ROLANDO P. MENDOZA',
    purpose: 'PASSPORT APPLICATION',
    orNumber: 'OR-788910',
    amountPaid: '200.00',
    dateIssued: '2025-11-25',
    issuedByUsername: 'mcr_admin',
    mcrOfficerName: 'HON. ATTY. ROBERTO G. MENDOZA',
    mcrOfficerTitle: 'Municipal Civil Registrar',
    verificationCode: 'CRIS-CLB-2025-7889-A1',
    createdAt: '2025-11-25T11:20:00.000Z',
  },
];

const INITIAL_MISC_REVENUE: MiscellaneousRevenueRecord[] = [
  {
    id: 'misc-rev-2026-1001',
    orNumber: 'OR-892305',
    amountPaid: '300.00',
    payerName: 'CARLOS MIGUEL SANTOS & EILEEN ROSE CRUZ',
    serviceType: 'Marriage License Application Fee',
    category: 'marriages',
    dateIssued: '2026-10-10',
    issuedByUsername: 'mcr_admin',
    notes: 'Official Marriage License Application and Notice Publication Fee',
    createdAt: '2026-10-10T10:00:00.000Z',
  },
  {
    id: 'misc-rev-2026-1002',
    orNumber: 'OR-892306',
    amountPaid: '250.00',
    payerName: 'RICARDO P. MANANSALA',
    serviceType: 'Late Registration Penalty & Endorsement Fee',
    category: 'births',
    dateIssued: '2026-10-06',
    issuedByUsername: 'clerk_culaba',
    notes: 'Delayed registration filing fee pursuant to Municipal Ordinance',
    createdAt: '2026-10-06T14:30:00.000Z',
  },
  {
    id: 'misc-rev-2026-0901',
    orNumber: 'OR-892204',
    amountPaid: '200.00',
    payerName: 'ATTY. GERARDO M. TUAZON',
    serviceType: 'Court Decree & Legal Instrument Filing Fee',
    category: 'legal-instruments',
    dateIssued: '2026-09-18',
    issuedByUsername: 'superadmin',
    notes: 'Affidavit of Acknowledgment / Legitimation recording fee',
    createdAt: '2026-09-18T11:00:00.000Z',
  },
];

const INITIAL_AUDIT: AuditLogItem[] = [
  {
    id: 'audit-001',
    timestamp: '2026-02-14 09:30:00',
    username: 'superadmin',
    action: 'CREATE',
    category: 'births',
    targetId: 'birth-2026-001',
    description: 'Added Birth Registry entry Book 54 Page 112 for JUAN MIGUEL DELA CRUZ PO',
  },
  {
    id: 'audit-002',
    timestamp: '2026-02-16 10:30:00',
    username: 'superadmin',
    action: 'ISSUE_CERT',
    category: 'CERTIFICATION',
    targetId: 'cert-2026-0001',
    description: 'Issued LCR Form 1A Certification to RAMON TANGKAP PO (O.R. #OR-892145)',
  },
];

export const INITIAL_PERSONNEL_MEMORY: PersonnelMemoryItem[] = [
  // Doctors / Physicians
  {
    id: 'pm-doc-1',
    name: 'DR. MA. SOCORRO C. MONTEJO, M.D.',
    designation: 'MUNICIPAL HEALTH OFFICER',
    roleType: 'doctor',
    addressOrAffiliation: 'CULABA RURAL HEALTH UNIT, CULABA, BILIRAN',
    usageCount: 14,
    lastUsedAt: '2026-02-25',
  },
  {
    id: 'pm-doc-2',
    name: 'DR. FELIPE D. CATINDIG, M.D.',
    designation: 'MUNICIPAL HEALTH OFFICER',
    roleType: 'doctor',
    addressOrAffiliation: 'BILIRAN PROVINCIAL HOSPITAL / RHU',
    usageCount: 9,
    lastUsedAt: '2026-02-20',
  },
  {
    id: 'pm-doc-3',
    name: 'DR. ROLANDO S. ESPINA, M.D.',
    designation: 'ATTENDING PHYSICIAN / MEDICAL OFFICER IV',
    roleType: 'doctor',
    addressOrAffiliation: 'BILIRAN DISTRICT HOSPITAL',
    usageCount: 6,
    lastUsedAt: '2026-02-18',
  },
  // Midwives
  {
    id: 'pm-mid-1',
    name: 'MELBA C. VALENZUELA, RM',
    designation: 'REGISTERED MIDWIFE',
    roleType: 'midwife',
    addressOrAffiliation: 'RURAL HEALTH UNIT, CULABA',
    usageCount: 22,
    lastUsedAt: '2026-02-28',
  },
  {
    id: 'pm-mid-2',
    name: 'JOSEFINA A. CORDOVA, RM',
    designation: 'PUBLIC HEALTH MIDWIFE II',
    roleType: 'midwife',
    addressOrAffiliation: 'BARANGAY HEALTH STATION, BOOL',
    usageCount: 15,
    lastUsedAt: '2026-02-15',
  },
  {
    id: 'pm-mid-3',
    name: 'TERESITA B. SALVADOR, RM',
    designation: 'RURAL HEALTH MIDWIFE',
    roleType: 'midwife',
    addressOrAffiliation: 'RHU BIRTHING FACILITY, CULABA',
    usageCount: 8,
    lastUsedAt: '2026-01-28',
  },
  // Nurses
  {
    id: 'pm-nur-1',
    name: 'CONCEPCION D. FLORES, RN',
    designation: 'STAFF NURSE / RHU NURSE',
    roleType: 'nurse',
    addressOrAffiliation: 'CULABA RURAL HEALTH UNIT',
    usageCount: 12,
    lastUsedAt: '2026-02-22',
  },
  {
    id: 'pm-nur-2',
    name: 'MARIA ELENA G. LIM, RN',
    designation: 'PUBLIC HEALTH NURSE I',
    roleType: 'nurse',
    addressOrAffiliation: 'MHO - RURAL HEALTH UNIT',
    usageCount: 10,
    lastUsedAt: '2026-02-12',
  },
  // MCR
  {
    id: 'pm-mcr-1',
    name: 'FRANCIS JEFF C. PO, MCR',
    designation: 'MUNICIPAL CIVIL REGISTRAR',
    roleType: 'mcr',
    addressOrAffiliation: 'OFFICE OF THE MUNICIPAL CIVIL REGISTRAR, CULABA',
    usageCount: 45,
    lastUsedAt: '2026-03-01',
  },
  {
    id: 'pm-mcr-2',
    name: 'MARIA CRISTINA SANTOS',
    designation: 'REGISTRATION OFFICER II / ASSISTANT MCR',
    roleType: 'mcr',
    addressOrAffiliation: 'OFFICE OF THE MUNICIPAL CIVIL REGISTRAR, CULABA',
    usageCount: 28,
    lastUsedAt: '2026-02-27',
  },
  {
    id: 'pm-mcr-3',
    name: 'HON. ATTY. ROBERTO G. MENDOZA',
    designation: 'ACTING MUNICIPAL CIVIL REGISTRAR',
    roleType: 'mcr',
    addressOrAffiliation: 'OFFICE OF THE MUNICIPAL CIVIL REGISTRAR',
    usageCount: 18,
    lastUsedAt: '2026-02-10',
  },
  // Solemnizing Officers
  {
    id: 'pm-sol-1',
    name: 'HON. JUDGE ALFONSO T. SERAFIN',
    designation: 'ACTING PRESIDING JUDGE, MTC',
    roleType: 'solemnizing_officer',
    addressOrAffiliation: 'HALL OF JUSTICE, CULABA, BILIRAN',
    usageCount: 31,
    lastUsedAt: '2026-02-26',
  },
  {
    id: 'pm-sol-2',
    name: 'REV. FR. ALBERTO G. ENRIQUEZ',
    designation: 'PARISH PRIEST',
    roleType: 'solemnizing_officer',
    addressOrAffiliation: 'ST. MICHAEL ARCHANGEL PARISH, CULABA',
    usageCount: 25,
    lastUsedAt: '2026-02-24',
  },
  {
    id: 'pm-sol-3',
    name: 'PASTOR JAIME L. DELFIN',
    designation: 'ORDAINED RESIDENT MINISTER',
    roleType: 'solemnizing_officer',
    addressOrAffiliation: 'BIBLE BAPTIST CHURCH, CULABA',
    usageCount: 7,
    lastUsedAt: '2026-01-30',
  },
  {
    id: 'pm-sol-4',
    name: 'HON. MAYOR RODOLFO M. CULABA',
    designation: 'MUNICIPAL MAYOR',
    roleType: 'solemnizing_officer',
    addressOrAffiliation: 'OFFICE OF THE MUNICIPAL MAYOR, CULABA',
    usageCount: 16,
    lastUsedAt: '2026-02-19',
  },
];

const INITIAL_NOTIFICATIONS: CrisNotification[] = [
  {
    id: 'notif-1',
    title: 'Civil Registry Security & Audit Active',
    message: 'CRIS v4.0 RBAC and tamper-evident audit trails are operational for the Municipality of Culaba.',
    type: 'SYSTEM_EVENT',
    priority: 'normal',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    read: false,
    recipientUsername: 'all',
    relatedModule: 'system',
    actionByUsername: 'superadmin',
    actionByName: 'System Administrator',
  },
  {
    id: 'notif-2',
    title: 'Birth Record Registered: Juan Miguel Dela Cruz Po',
    message: 'Official Birth Record filed under Book 2026 Page 0046, Registry No. 2026-0046.',
    type: 'RECORD_CREATED',
    priority: 'normal',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    read: false,
    recipientUsername: 'all',
    relatedModule: 'births',
    relatedRecordId: 'birth-1',
    relatedRecordNumber: '2026-0046',
    actionByUsername: 'clerk_culaba',
    actionByName: 'Civil Registry Clerk',
  },
  {
    id: 'notif-3',
    title: 'Certification Issued: LCR Form 1A',
    message: 'Birth Certification 2026-B-0089 issued for Juan Miguel Dela Cruz Po (O.R. No. 8920114).',
    type: 'CERTIFICATION_ISSUED',
    priority: 'normal',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    read: false,
    recipientUsername: 'all',
    relatedModule: 'certifications',
    relatedRecordNumber: '2026-B-0089',
    actionByUsername: 'mcr_admin',
    actionByName: 'Hon. Atty. Roberto G. Mendoza',
  },
  {
    id: 'notif-4',
    title: 'Marriage Record Registered: Santos & Reyes',
    message: 'Official Marriage Record filed under Book 2026 Page 0012, Registry No. 2026-0012.',
    type: 'RECORD_CREATED',
    priority: 'normal',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    read: false,
    recipientUsername: 'all',
    relatedModule: 'marriages',
    relatedRecordId: 'marr-1',
    relatedRecordNumber: '2026-0012',
    actionByUsername: 'clerk_culaba',
    actionByName: 'Civil Registry Clerk',
  },
  {
    id: 'notif-5',
    title: 'Administrative Announcement: Civil Registration Compliance',
    message: 'All civil registration fees and document requests must comply with the updated Municipal Ordinance 2026-04.',
    type: 'ANNOUNCEMENT',
    priority: 'high',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    read: false,
    recipientUsername: 'all',
    targetRoles: ['superadmin', 'mcr', 'admin', 'clerk', 'user'],
    relatedModule: 'settings',
    actionByUsername: 'mcr_admin',
    actionByName: 'Municipal Civil Registrar',
  },
];

// LocalStorage Keys
export const STORAGE_KEYS = {
  USERS: 'cris_users_v1',
  SETTINGS: 'cris_settings_v1',
  BIRTHS: 'cris_births_v1',
  MARRIAGES: 'cris_marriages_v1',
  DEATHS: 'cris_deaths_v1',
  LEGAL: 'cris_legal_v1',
  CERTS: 'cris_certs_v1',
  AUDIT: 'cris_audit_v1',
  CURRENT_USER: 'cris_session_user_v1',
  PERSONNEL_MEMORY: 'cris_personnel_memory_v1',
  TEMPLATES: 'cris_templates_v1',
  NOTIFICATIONS: 'cris_notifications_v1',
  MISC_REVENUE: 'cris_misc_revenue_v1',
};

class StorageService {
  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    } else {
      // Ensure superadmin account exists and has required details
      const currentUsers = this.getUsersRaw();
      const hasSuperadmin = currentUsers.some(
        (u) => u.username === 'superadmin' || u.username === 'franzpo' || u.role === 'superadmin'
      );
      if (!hasSuperadmin) {
        currentUsers.unshift(INITIAL_USERS[0]);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(currentUsers));
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BIRTHS)) {
      localStorage.setItem(STORAGE_KEYS.BIRTHS, JSON.stringify(INITIAL_BIRTHS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MARRIAGES)) {
      localStorage.setItem(STORAGE_KEYS.MARRIAGES, JSON.stringify(INITIAL_MARRIAGES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DEATHS)) {
      localStorage.setItem(STORAGE_KEYS.DEATHS, JSON.stringify(INITIAL_DEATHS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LEGAL)) {
      localStorage.setItem(STORAGE_KEYS.LEGAL, JSON.stringify(INITIAL_LEGAL_INSTRUMENTS));
    } else {
      try {
        const existingLegal = this.getRecords('legal-instruments') as LegalInstrumentRecord[];
        let updated = false;
        existingLegal.forEach((l) => {
          if (!l.orNumber) {
            l.orNumber = 'OR-892150';
            l.amountPaid = '200.00';
            updated = true;
          }
        });
        INITIAL_LEGAL_INSTRUMENTS.forEach((il) => {
          if (!existingLegal.some((l) => l.id === il.id || l.registryNumber === il.registryNumber)) {
            existingLegal.push(il);
            updated = true;
          }
        });
        if (updated) {
          this.saveRecords('legal-instruments', existingLegal);
        }
      } catch {}
    }
    if (!localStorage.getItem(STORAGE_KEYS.CERTS)) {
      localStorage.setItem(STORAGE_KEYS.CERTS, JSON.stringify(INITIAL_CERTIFICATIONS));
    } else {
      // Ensure users with legacy 1-item cache receive multi-month certification history for revenue tracking
      try {
        const existingCerts = this.getCertifications();
        if (existingCerts.length <= 1) {
          const merged = [...existingCerts];
          INITIAL_CERTIFICATIONS.forEach((ic) => {
            if (!merged.some((c) => c.id === ic.id || c.certNumber === ic.certNumber)) {
              merged.push(ic);
            }
          });
          this.saveCertifications(merged);
        }
      } catch {}
    }
    if (!localStorage.getItem(STORAGE_KEYS.MISC_REVENUE)) {
      localStorage.setItem(STORAGE_KEYS.MISC_REVENUE, JSON.stringify(INITIAL_MISC_REVENUE));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT)) {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(INITIAL_AUDIT));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PERSONNEL_MEMORY)) {
      localStorage.setItem(STORAGE_KEYS.PERSONNEL_MEMORY, JSON.stringify(INITIAL_PERSONNEL_MEMORY));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    }

    // Sanitize any legacy personal contact details from stored settings or accounts for deployment readiness
    try {
      const savedSettings = this.getSettings();
      if (
        savedSettings &&
        (savedSettings.contactEmail === 'fjp.culaba@gmail.com' ||
          savedSettings.contactPhone === '09557213860')
      ) {
        if (savedSettings.contactEmail === 'fjp.culaba@gmail.com') {
          savedSettings.contactEmail = 'mcr@culaba.gov.ph';
        }
        if (savedSettings.contactPhone === '09557213860') {
          savedSettings.contactPhone = '(053) 564-1000';
        }
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(savedSettings));
      }

      const rawUsers = this.getUsersRaw();
      let usersUpdated = false;
      rawUsers.forEach((u) => {
        if (u.role === 'superadmin' || u.username === 'superadmin') {
          u.name = 'Francis Jeff Po';
          u.email = 'fjp.culaba@gmail.com';
          u.number = '09557213860';
          usersUpdated = true;
        }
      });
      if (usersUpdated) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(rawUsers));
      }

      const currentSession = this.getCurrentUser();
      if (currentSession && (currentSession.role === 'superadmin' || currentSession.username === 'superadmin')) {
        currentSession.name = 'Francis Jeff Po';
        currentSession.email = 'fjp.culaba@gmail.com';
        currentSession.number = '09557213860';
        this.setCurrentUser(currentSession);
      }
    } catch {
      // Safe fallback
    }
  }

  // Raw users getter
  getUsersRaw(): UserAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  // Get users respecting invisible superadmin rule
  getUsers(viewingUser?: UserAccount | null): UserAccount[] {
    const users = this.getUsersRaw();
    if (viewingUser && viewingUser.role === 'superadmin') {
      return users;
    }
    // Normal users / MCR cannot see superadmin if marked invisible
    return users.filter((u) => !u.isSuperadminInvisible);
  }

  saveUsers(users: UserAccount[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  getSettings(): SiteSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const settings = data ? JSON.parse(data) : INITIAL_SETTINGS;
      if (!settings.mcrStaff || settings.mcrStaff.length === 0) {
        settings.mcrStaff = [
          {
            id: 'staff-igmedio',
            name: 'IGMEDIO JR. S. TABON',
            title: 'RCO - II',
            isDefault: true,
          },
        ];
      }
      return settings;
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  saveSettings(settings: SiteSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    cloudSyncService.syncSettings(settings);
    const opUser = this.getCurrentUser()?.username || 'admin';
    this.addAuditLog({
      username: opUser,
      action: 'SETTINGS',
      category: 'SYSTEM',
      description: 'Updated Civil Registry Office site configuration and official signatory profile.',
    });
    this.addNotification({
      title: 'Office Configuration Updated',
      message: `Signatory profile and municipality settings updated for ${settings.municipality}, ${settings.province}.`,
      type: 'SYSTEM_EVENT',
      priority: 'normal',
      recipientUsername: 'all',
      relatedModule: 'settings',
      actionByUsername: opUser,
    });
  }

  // Records retrieval
  getRecords(category: RegistryCategory): AnyRegistryRecord[] {
    const key =
      category === 'births'
        ? STORAGE_KEYS.BIRTHS
        : category === 'marriages'
        ? STORAGE_KEYS.MARRIAGES
        : category === 'deaths'
        ? STORAGE_KEYS.DEATHS
        : STORAGE_KEYS.LEGAL;

    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveRecords(category: RegistryCategory, records: AnyRegistryRecord[]) {
    const key =
      category === 'births'
        ? STORAGE_KEYS.BIRTHS
        : category === 'marriages'
        ? STORAGE_KEYS.MARRIAGES
        : category === 'deaths'
        ? STORAGE_KEYS.DEATHS
        : STORAGE_KEYS.LEGAL;

    localStorage.setItem(key, JSON.stringify(records));
  }

  // Add record
  addRecord(record: AnyRegistryRecord, username: string): AnyRegistryRecord {
    const records = this.getRecords(record.category);
    records.unshift(record);
    this.saveRecords(record.category, records);
    cloudSyncService.syncRecord(record);

    this.addAuditLog({
      username,
      action: 'CREATE',
      category: record.category,
      targetId: record.id,
      description: `Created new index Book ${record.bookNumber} Page ${record.pageNumber} Reg# ${record.registryNumber}`,
    });

    const categoryTitle =
      record.category === 'births'
        ? 'Birth'
        : record.category === 'marriages'
        ? 'Marriage'
        : record.category === 'deaths'
        ? 'Death'
        : 'Legal Instrument';

    this.addNotification({
      title: `New ${categoryTitle} Record Registered`,
      message: `${categoryTitle} Record registered under Book ${record.bookNumber || 'N/A'}, Page ${record.pageNumber || 'N/A'}, Registry No. ${record.registryNumber}.`,
      type: 'RECORD_CREATED',
      priority: 'normal',
      recipientUsername: 'all',
      relatedModule: record.category,
      relatedRecordId: record.id,
      relatedRecordNumber: record.registryNumber,
      actionByUsername: username,
    });

    if (record.category === 'legal-instruments' && (record as LegalInstrumentRecord).orNumber) {
      const li = record as LegalInstrumentRecord;
      this.addNotification({
        title: `Legal Instrument Fee Collected: ₱${li.amountPaid || '200.00'}`,
        message: `O.R. No. ${li.orNumber} recorded for ${li.typeOfLegalInstrument} (${li.name}) by @${username}. Included in CRIS Revenue Center.`,
        type: 'CERTIFICATION_ISSUED',
        priority: 'normal',
        recipientUsername: 'all',
        relatedModule: 'legal-instruments',
        relatedRecordId: record.id,
        relatedRecordNumber: li.orNumber,
        actionByUsername: username,
      });
    }

    return record;
  }

  // Update record with version tracking
  updateRecord(updated: AnyRegistryRecord, modifiedBy: string, changesSummary: string): AnyRegistryRecord {
    const records = this.getRecords(updated.category);
    const index = records.findIndex((r) => r.id === updated.id);
    if (index === -1) throw new Error('Record not found');

    const oldRecord = records[index];
    const newVersionNum = (oldRecord.versions?.length || 1) + 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Strip nested versions and heavy attachment dataUrls from the snapshot
    // to prevent exponential payload growth and stay within storage boundaries
    const { versions: _oldVersions, ...cleanSnapshotBase } = oldRecord;
    const snapshotToSave: any = { ...cleanSnapshotBase };
    if (snapshotToSave.pdfAttachment?.dataUrl) {
      snapshotToSave.pdfAttachment = {
        ...snapshotToSave.pdfAttachment,
        dataUrl: '',
      };
    }

    const versionEntry = {
      version: newVersionNum,
      modifiedAt: now,
      modifiedBy,
      changesSummary: changesSummary || `Updated fields at ${now}`,
      snapshot: snapshotToSave,
    };

    const newVersions = [...(oldRecord.versions || []), versionEntry];

    const recordToSave = {
      ...updated,
      updatedAt: now,
      updatedBy: modifiedBy,
      versions: newVersions,
    };

    records[index] = recordToSave;
    this.saveRecords(updated.category, records);
    cloudSyncService.syncRecord(recordToSave);

    this.addAuditLog({
      username: modifiedBy,
      action: 'UPDATE',
      category: updated.category,
      targetId: updated.id,
      description: `Updated index Book ${updated.bookNumber} Page ${updated.pageNumber} (v${newVersionNum})`,
    });

    const categoryTitle =
      updated.category === 'births'
        ? 'Birth'
        : updated.category === 'marriages'
        ? 'Marriage'
        : updated.category === 'deaths'
        ? 'Death'
        : 'Legal Instrument';

    this.addNotification({
      title: `${categoryTitle} Record Updated (v${newVersionNum})`,
      message: `${categoryTitle} Record Book ${updated.bookNumber || 'N/A'} Page ${updated.pageNumber || 'N/A'} Reg# ${updated.registryNumber}: ${changesSummary || 'Record updated'}.`,
      type: 'RECORD_UPDATED',
      priority: 'normal',
      recipientUsername: 'all',
      relatedModule: updated.category,
      relatedRecordId: updated.id,
      relatedRecordNumber: updated.registryNumber,
      actionByUsername: modifiedBy,
    });

    return recordToSave;
  }

  // Delete record (RBAC checked)
  deleteRecord(category: RegistryCategory, id: string, user: UserAccount): boolean {
    if (!user.permissions.canDelete && user.role !== 'superadmin' && user.role !== 'mcr') {
      throw new Error('Unauthorized: Only Superadmin, MCR, or users with delete permission may delete registry records.');
    }

    const records = this.getRecords(category);
    const target = records.find((r) => r.id === id);
    if (!target) return false;

    const filtered = records.filter((r) => r.id !== id);
    this.saveRecords(category, filtered);
    cloudSyncService.deleteRecord(id);

    this.addAuditLog({
      username: user.username,
      action: 'DELETE',
      category,
      targetId: id,
      description: `Deleted index Book ${target.bookNumber} Page ${target.pageNumber} Reg# ${target.registryNumber}`,
    });

    this.addNotification({
      title: `Record Deleted from ${category.toUpperCase()}`,
      message: `Registry index Book ${target.bookNumber || 'N/A'} Page ${target.pageNumber || 'N/A'} Reg# ${target.registryNumber} deleted by @${user.username}.`,
      type: 'RECORD_DELETED',
      priority: 'high',
      recipientUsername: 'all',
      relatedModule: category,
      relatedRecordId: id,
      relatedRecordNumber: target.registryNumber,
      actionByUsername: user.username,
    });

    return true;
  }

  // Certifications
  getCertifications(): IssuedCertification[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CERTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveCertifications(certs: IssuedCertification[]) {
    localStorage.setItem(STORAGE_KEYS.CERTS, JSON.stringify(certs));
  }

  addCertification(cert: IssuedCertification, username: string): IssuedCertification {
    const certs = this.getCertifications();
    certs.unshift(cert);
    this.saveCertifications(certs);
    cloudSyncService.syncCertification(cert);

    this.addAuditLog({
      username,
      action: 'ISSUE_CERT',
      category: 'CERTIFICATION',
      targetId: cert.id,
      description: `Issued LCR Form ${cert.formType.replace('LCR_FORM_', '')}${cert.formLetter} (${cert.certNumber}) to ${cert.personName}`,
    });

    this.addNotification({
      title: `Certification Issued: ${cert.certNumber}`,
      message: `LCR Form ${cert.formType.replace('LCR_FORM_', '')}${cert.formLetter} issued to ${cert.personName} (O.R. No. ${cert.orNumber}).`,
      type: 'CERTIFICATION_ISSUED',
      priority: 'normal',
      recipientUsername: 'all',
      relatedModule: 'certifications',
      relatedRecordNumber: cert.certNumber,
      actionByUsername: username,
    });

    return cert;
  }

  saveCertification(cert: IssuedCertification): IssuedCertification {
    const certs = this.getCertifications();
    const existingIndex = certs.findIndex((c) => c.id === cert.id || c.certNumber === cert.certNumber);
    if (existingIndex >= 0) {
      certs[existingIndex] = { ...certs[existingIndex], ...cert };
      this.saveCertifications(certs);
      cloudSyncService.syncCertification(certs[existingIndex]);
      return certs[existingIndex];
    }
    return this.addCertification(cert, cert.issuedByUsername || 'admin');
  }

  deleteCertification(id: string, user: UserAccount): boolean {
    if (user.role !== 'superadmin') {
      throw new Error('Unauthorized: Only Superadmin can delete issued certifications.');
    }

    const certs = this.getCertifications();
    const target = certs.find((c) => c.id === id);
    if (!target) return false;

    const filtered = certs.filter((c) => c.id !== id);
    this.saveCertifications(filtered);
    cloudSyncService.deleteCertification(id);

    this.addAuditLog({
      username: user.username,
      action: 'DELETE',
      category: 'CERTIFICATION',
      targetId: id,
      description: `Superadmin deleted issued certification #${target.certNumber} (LCR Form ${target.formType.replace('LCR_FORM_', '')}${target.formLetter} for ${target.personName})`,
    });

    this.addNotification({
      title: 'Certification Revoked / Deleted',
      message: `Issued certification #${target.certNumber} (${target.personName}) deleted by @${user.username}.`,
      type: 'SYSTEM_EVENT',
      priority: 'high',
      recipientUsername: 'all',
      relatedModule: 'certifications',
      relatedRecordNumber: target.certNumber,
      actionByUsername: user.username,
    });

    return true;
  }

  bulkDeleteCertifications(ids: string[], user: UserAccount): number {
    if (user.role !== 'superadmin') {
      throw new Error('Unauthorized: Only Superadmin can bulk delete issued certifications.');
    }

    const certs = this.getCertifications();
    const toDelete = certs.filter((c) => ids.includes(c.id));
    const filtered = certs.filter((c) => !ids.includes(c.id));
    this.saveCertifications(filtered);
    ids.forEach((id) => cloudSyncService.deleteCertification(id));

    this.addAuditLog({
      username: user.username,
      action: 'DELETE',
      category: 'CERTIFICATION',
      description: `Superadmin bulk deleted ${toDelete.length} issued certifications to clean up training/test records`,
    });

    return toDelete.length;
  }

  clearAllCertifications(user: UserAccount): boolean {
    if (user.role !== 'superadmin') {
      throw new Error('Unauthorized: Only Superadmin can clear issued certifications.');
    }

    const certs = this.getCertifications();
    const count = certs.length;
    this.saveCertifications([]);

    this.addAuditLog({
      username: user.username,
      action: 'DELETE',
      category: 'CERTIFICATION',
      description: `Superadmin cleaned up all ${count} issued certifications (training log cleanup)`,
    });

    return true;
  }

  // =========================================================================
  // REVENUE & COLLECTIONS SYSTEM (Monthly & Yearly Reset Engine)
  // Monthly Reset: 1st day of each month (00:00:00)
  // Yearly Reset: 1st day of each year (January 1, 00:00:00)
  // =========================================================================

  getMiscellaneousRevenue(): MiscellaneousRevenueRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MISC_REVENUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveMiscellaneousRevenue(records: MiscellaneousRevenueRecord[]) {
    localStorage.setItem(STORAGE_KEYS.MISC_REVENUE, JSON.stringify(records));
  }

  addMiscellaneousRevenue(
    record: Omit<MiscellaneousRevenueRecord, 'id' | 'createdAt'>,
    operatorUsername: string
  ): MiscellaneousRevenueRecord {
    const list = this.getMiscellaneousRevenue();
    const newRecord: MiscellaneousRevenueRecord = {
      ...record,
      id: `misc-rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newRecord);
    this.saveMiscellaneousRevenue(list);

    this.addAuditLog({
      username: operatorUsername,
      action: 'CREATE',
      category: 'CERTIFICATION',
      targetId: newRecord.id,
      description: `Collected fee for ${newRecord.serviceType} (O.R. #${newRecord.orNumber}) - ₱${newRecord.amountPaid} from ${newRecord.payerName}`,
    });

    this.addNotification({
      title: `Revenue Collected: ₱${newRecord.amountPaid}`,
      message: `O.R. No. ${newRecord.orNumber} issued for ${newRecord.serviceType} (${newRecord.payerName}).`,
      type: 'CERTIFICATION_ISSUED',
      priority: 'normal',
      recipientUsername: 'all',
      relatedModule: 'certifications',
      relatedRecordNumber: newRecord.orNumber,
      actionByUsername: operatorUsername,
    });

    return newRecord;
  }

  deleteMiscellaneousRevenue(id: string, user: UserAccount): boolean {
    if (user.role !== 'superadmin' && user.role !== 'mcr') {
      throw new Error('Unauthorized: Only Superadmin or MCR can delete collection records.');
    }
    const list = this.getMiscellaneousRevenue();
    const target = list.find((r) => r.id === id);
    if (!target) return false;

    const filtered = list.filter((r) => r.id !== id);
    this.saveMiscellaneousRevenue(filtered);

    this.addAuditLog({
      username: user.username,
      action: 'DELETE',
      category: 'CERTIFICATION',
      targetId: id,
      description: `Deleted fee record O.R. #${target.orNumber} (${target.serviceType})`,
    });

    return true;
  }

  /**
   * Unified list of all Official Receipts and revenue collection items
   */
  getAllRevenueItems(): CrisRevenueItem[] {
    const certs = this.getCertifications();
    const misc = this.getMiscellaneousRevenue();

    const items: CrisRevenueItem[] = [];

    certs.forEach((c) => {
      const amt = parseFloat(String(c.amountPaid || '0').replace(/[^0-9.]/g, '')) || 0;
      items.push({
        id: c.id,
        orNumber: c.orNumber || 'N/A',
        amount: amt,
        date: c.dateIssued || (c.createdAt ? c.createdAt.split('T')[0] : '2026-01-01'),
        payerOrSubject: c.personName || c.requestedBy || 'N/A',
        serviceDescription: `LCR Form ${c.formType.replace('LCR_FORM_', '')}${c.formLetter} Certification (${c.certNumber})`,
        sourceType: 'CERTIFICATION',
        formType: c.formType,
        formLetter: c.formLetter,
        category: c.category,
        issuedBy: c.issuedByUsername || 'staff',
        purpose: c.purpose,
      });
    });

    misc.forEach((m) => {
      const amt = parseFloat(String(m.amountPaid || '0').replace(/[^0-9.]/g, '')) || 0;
      items.push({
        id: m.id,
        orNumber: m.orNumber || 'N/A',
        amount: amt,
        date: m.dateIssued || (m.createdAt ? m.createdAt.split('T')[0] : '2026-01-01'),
        payerOrSubject: m.payerName || 'N/A',
        serviceDescription: m.serviceType,
        sourceType: 'MISCELLANEOUS_FEE',
        category: m.category || 'general',
        issuedBy: m.issuedByUsername || 'staff',
        purpose: m.notes,
      });
    });

    // Registered Legal Instruments with O.R. Number & Fees
    const legalRecords = this.getRecords('legal-instruments') as LegalInstrumentRecord[];
    legalRecords.forEach((l) => {
      const amt = parseFloat(String(l.amountPaid || '0').replace(/[^0-9.]/g, '')) || 0;
      if (amt > 0 || Boolean(l.orNumber)) {
        items.push({
          id: l.id,
          orNumber: l.orNumber || `OR-${l.registryNumber || 'LI'}`,
          amount: amt,
          date: l.dateOfRegistration || l.registryDate || (l.firstAddedDateTime ? l.firstAddedDateTime.split(' ')[0] : '2026-01-01'),
          payerOrSubject: l.name || 'N/A',
          serviceDescription: `Legal Instrument: ${l.typeOfLegalInstrument || 'Court Decree / Affidavit'} (Reg #${l.registryNumber})`,
          sourceType: 'LEGAL_INSTRUMENT',
          category: 'legal-instruments',
          issuedBy: l.usernameAdded || 'staff',
          purpose: l.remarks || l.typeOfLegalInstrument,
        });
      }
    });

    // Sort newest first
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Summarizes total revenue per month and year.
   * - Reset of revenue per month is the first day of the month (00:00:00).
   * - Reset of revenue per year is the first day of the year (January 1, 00:00:00).
   */
  getRevenueSummary(targetYear?: number, customNow?: Date): RevenueSummaryMetrics {
    const now = customNow || new Date();
    const curYear = now.getFullYear();
    const curMonthIndex = now.getMonth(); // 0 = Jan, 9 = Oct
    const selYear = targetYear !== undefined ? targetYear : curYear;

    const allItems = this.getAllRevenueItems();

    // Today date string: YYYY-MM-DD
    const todayStr = `${curYear}-${String(curMonthIndex + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Current Month Boundaries (1st day of month 00:00:00 to last day 23:59:59)
    // Monthly revenue resets on the first day of the month
    const startOfCurrentMonth = new Date(curYear, curMonthIndex, 1, 0, 0, 0, 0);
    const endOfCurrentMonth = new Date(curYear, curMonthIndex + 1, 0, 23, 59, 59, 999);

    // Current Year Boundaries (Jan 1 00:00:00 to Dec 31 23:59:59)
    // Yearly revenue resets on the first day of the year
    const startOfCurrentYear = new Date(curYear, 0, 1, 0, 0, 0, 0);
    const endOfCurrentYear = new Date(curYear, 11, 31, 23, 59, 59, 999);

    let currentMonthRevenue = 0;
    let currentMonthTransactions = 0;

    let currentYearRevenue = 0;
    let currentYearTransactions = 0;

    let todayRevenue = 0;
    let todayTransactions = 0;

    let allTimeRevenue = 0;
    let allTimeTransactions = 0;

    // Monthly breakdown buckets for selected year (12 months)
    const monthlyBuckets = Array.from({ length: 12 }, () => ({
      revenue: 0,
      count: 0,
    }));

    // Service breakdown buckets
    const serviceMap = new Map<string, { label: string; revenue: number; count: number }>();
    serviceMap.set('LCR_FORM_1', { label: 'LCR Form 1 (Birth Certificates)', revenue: 0, count: 0 });
    serviceMap.set('LCR_FORM_2', { label: 'LCR Form 2 (Death Certificates)', revenue: 0, count: 0 });
    serviceMap.set('LCR_FORM_3', { label: 'LCR Form 3 (Marriage Certificates)', revenue: 0, count: 0 });
    serviceMap.set('LEGAL', { label: 'Legal Instruments & Court Decrees', revenue: 0, count: 0 });
    serviceMap.set('MISC', { label: 'Civil Registry Fees & Licenses', revenue: 0, count: 0 });

    // Multi-year buckets
    const yearMap = new Map<number, { revenue: number; count: number }>();
    yearMap.set(curYear, { revenue: 0, count: 0 });
    yearMap.set(curYear - 1, { revenue: 0, count: 0 });

    allItems.forEach((item) => {
      const d = new Date(item.date);
      const isDateValid = !isNaN(d.getTime());
      const itemTime = isDateValid ? d.getTime() : 0;
      const itemYear = isDateValid ? d.getFullYear() : curYear;
      const itemMonth = isDateValid ? d.getMonth() : 0;

      // All-time accumulation
      allTimeRevenue += item.amount;
      allTimeTransactions += 1;

      // Multi-year tracking
      if (!yearMap.has(itemYear)) {
        yearMap.set(itemYear, { revenue: 0, count: 0 });
      }
      const yStats = yearMap.get(itemYear)!;
      yStats.revenue += item.amount;
      yStats.count += 1;

      // Current Month Accumulation (Resets on the 1st day of each month)
      if (itemTime >= startOfCurrentMonth.getTime() && itemTime <= endOfCurrentMonth.getTime()) {
        currentMonthRevenue += item.amount;
        currentMonthTransactions += 1;
      }

      // Current Year Accumulation (Resets on January 1st yearly)
      if (itemTime >= startOfCurrentYear.getTime() && itemTime <= endOfCurrentYear.getTime()) {
        currentYearRevenue += item.amount;
        currentYearTransactions += 1;
      }

      // Today
      if (item.date === todayStr) {
        todayRevenue += item.amount;
        todayTransactions += 1;
      }

      // Selected Year Breakdown
      if (itemYear === selYear) {
        if (itemMonth >= 0 && itemMonth < 12) {
          monthlyBuckets[itemMonth].revenue += item.amount;
          monthlyBuckets[itemMonth].count += 1;
        }

        // Service type breakdown
        if (item.sourceType === 'LEGAL_INSTRUMENT' || item.category === 'legal-instruments') {
          const s = serviceMap.get('LEGAL')!;
          s.revenue += item.amount;
          s.count += 1;
        } else if (item.formType === 'LCR_FORM_1') {
          const s = serviceMap.get('LCR_FORM_1')!;
          s.revenue += item.amount;
          s.count += 1;
        } else if (item.formType === 'LCR_FORM_2') {
          const s = serviceMap.get('LCR_FORM_2')!;
          s.revenue += item.amount;
          s.count += 1;
        } else if (item.formType === 'LCR_FORM_3') {
          const s = serviceMap.get('LCR_FORM_3')!;
          s.revenue += item.amount;
          s.count += 1;
        } else {
          const s = serviceMap.get('MISC')!;
          s.revenue += item.amount;
          s.count += 1;
        }
      }
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthFullNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const selectedYearRevenue = monthlyBuckets.reduce((sum, b) => sum + b.revenue, 0);
    const selectedYearTransactions = monthlyBuckets.reduce((sum, b) => sum + b.count, 0);

    const monthlyBreakdown: MonthlyRevenueData[] = monthlyBuckets.map((b, idx) => {
      const isCurrentMonth = selYear === curYear && idx === curMonthIndex;
      const isPastMonth = selYear < curYear || (selYear === curYear && idx < curMonthIndex);
      const isFutureMonth = selYear > curYear || (selYear === curYear && idx > curMonthIndex);

      const lastDayOfMonth = new Date(selYear, idx + 1, 0).getDate();
      const periodStart = `${selYear}-${String(idx + 1).padStart(2, '0')}-01`;
      const periodEnd = `${selYear}-${String(idx + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      return {
        monthIndex: idx,
        monthName: monthNames[idx],
        monthFullName: monthFullNames[idx],
        year: selYear,
        revenue: b.revenue,
        transactionCount: b.count,
        averageFee: b.count > 0 ? b.revenue / b.count : 0,
        isCurrentMonth,
        isPastMonth,
        isFutureMonth,
        periodStart,
        periodEnd,
        shareOfAnnualPercent: selectedYearRevenue > 0 ? (b.revenue / selectedYearRevenue) * 100 : 0,
      };
    });

    // Multi-year breakdown array sorted descending
    const allYears = Array.from(yearMap.keys()).sort((a, b) => b - a);
    const yearlyBreakdown: YearlyRevenueData[] = allYears.map((yr) => {
      const stat = yearMap.get(yr)!;
      return {
        year: yr,
        revenue: stat.revenue,
        transactionCount: stat.count,
        averageFee: stat.count > 0 ? stat.revenue / stat.count : 0,
        isCurrentYear: yr === curYear,
        periodStart: `${yr}-01-01`,
        periodEnd: `${yr}-12-31`,
      };
    });

    // Next resets calculation
    // Next monthly reset is the 1st day of next month
    const nextMonthlyResetDate = new Date(curYear, curMonthIndex + 1, 1, 0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilMonthlyReset = Math.max(0, Math.ceil((nextMonthlyResetDate.getTime() - now.getTime()) / msPerDay));
    const monthlyResetDateFormatted = nextMonthlyResetDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Next yearly reset is January 1st of next year
    const nextYearlyResetDate = new Date(curYear + 1, 0, 1, 0, 0, 0, 0);
    const daysUntilYearlyReset = Math.max(0, Math.ceil((nextYearlyResetDate.getTime() - now.getTime()) / msPerDay));
    const yearlyResetDateFormatted = nextYearlyResetDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Service breakdown array
    const serviceBreakdown = Array.from(serviceMap.entries()).map(([key, val]) => ({
      key,
      label: val.label,
      revenue: val.revenue,
      count: val.count,
      percentage: selectedYearRevenue > 0 ? (val.revenue / selectedYearRevenue) * 100 : 0,
    }));

    return {
      currentMonthRevenue,
      currentMonthTransactions,
      currentMonthAverageFee: currentMonthTransactions > 0 ? currentMonthRevenue / currentMonthTransactions : 0,
      currentMonthLabel: `${monthFullNames[curMonthIndex]} ${curYear}`,
      monthlyResetDateFormatted,
      daysUntilMonthlyReset,

      currentYearRevenue,
      currentYearTransactions,
      currentYearAverageFee: currentYearTransactions > 0 ? currentYearRevenue / currentYearTransactions : 0,
      currentYearLabel: `${curYear}`,
      yearlyResetDateFormatted,
      daysUntilYearlyReset,

      todayRevenue,
      todayTransactions,

      allTimeRevenue,
      allTimeTransactions,

      selectedYear: selYear,
      selectedYearRevenue,
      selectedYearTransactions,
      monthlyBreakdown,

      yearlyBreakdown,
      serviceBreakdown,
    };
  }

  // Certificate Templates (Forms 1x, 2x, 3x)
  getCertificateTemplates(): MunicipalCertificateTemplate[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (data) {
        return JSON.parse(data);
      }
      return this.initDefaultTemplates();
    } catch {
      return this.initDefaultTemplates();
    }
  }

  private initDefaultTemplates(): MunicipalCertificateTemplate[] {
    const settings = this.getSettings();
    const forms: { type: LcrFormType; letter: LcrFormLetter }[] = [
      { type: 'LCR_FORM_1', letter: 'A' },
      { type: 'LCR_FORM_1', letter: 'B' },
      { type: 'LCR_FORM_1', letter: 'C' },
      { type: 'LCR_FORM_2', letter: 'A' },
      { type: 'LCR_FORM_2', letter: 'B' },
      { type: 'LCR_FORM_2', letter: 'C' },
      { type: 'LCR_FORM_3', letter: 'A' },
      { type: 'LCR_FORM_3', letter: 'B' },
      { type: 'LCR_FORM_3', letter: 'C' },
    ];
    const templates = forms.map((f) =>
      createDefaultTemplate(f.type, f.letter, settings.municipality, settings.province)
    );
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    return templates;
  }

  getCertificateTemplate(formType: LcrFormType, formLetter: LcrFormLetter): MunicipalCertificateTemplate {
    const templates = this.getCertificateTemplates();
    const match = templates.find((t) => t.formType === formType && t.formLetter === formLetter);
    if (match) return match;
    const settings = this.getSettings();
    const def = createDefaultTemplate(formType, formLetter, settings.municipality, settings.province);
    templates.push(def);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    return def;
  }

  saveCertificateTemplate(template: MunicipalCertificateTemplate, user?: UserAccount): void {
    const templates = this.getCertificateTemplates();
    const index = templates.findIndex(
      (t) => t.formType === template.formType && t.formLetter === template.formLetter
    );
    template.lastUpdated = new Date().toISOString();
    if (index >= 0) {
      templates[index] = template;
    } else {
      templates.push(template);
    }
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    cloudSyncService.syncTemplate(template);

    if (user) {
      this.addAuditLog({
        username: user.username,
        action: 'UPDATE',
        category: 'CERTIFICATION',
        targetId: template.id,
        description: `Updated layout and template design for ${template.name}`,
      });
    }
  }

  resetCertificateTemplate(
    formType: LcrFormType,
    formLetter: LcrFormLetter,
    user?: UserAccount
  ): MunicipalCertificateTemplate {
    const settings = this.getSettings();
    const fresh = createDefaultTemplate(formType, formLetter, settings.municipality, settings.province);
    this.saveCertificateTemplate(fresh, user);
    return fresh;
  }

  // Audit Logs
  getAuditLogs(): AuditLogItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  addAuditLog(item: Omit<AuditLogItem, 'id' | 'timestamp'>) {
    const logs = this.getAuditLogs();
    const newLog: AuditLogItem = {
      id: 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ...item,
    };
    logs.unshift(newLog);
    // Keep last 300 logs
    if (logs.length > 300) logs.pop();
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(logs));
  }

  // Session User
  getCurrentUser(): UserAccount | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setCurrentUser(user: UserAccount | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      this.addAuditLog({
        username: user.username,
        action: 'LOGIN',
        category: 'AUTH',
        description: `User ${user.name} (${user.role.toUpperCase()}) logged in successfully.`,
      });
    } else {
      const prev = this.getCurrentUser();
      if (prev) {
        this.addAuditLog({
          username: prev.username,
          action: 'LOGOUT',
          category: 'AUTH',
          description: `User ${prev.name} logged out.`,
        });
      }
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  // Personnel Memory Bank (Nurses, Midwives, Doctors, MCR, Solemnizing Officers)
  getPersonnelMemory(roleType?: PersonnelRole): PersonnelMemoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PERSONNEL_MEMORY);
      const items: PersonnelMemoryItem[] = data ? JSON.parse(data) : INITIAL_PERSONNEL_MEMORY;
      if (roleType) {
        return items.filter((p) => p.roleType === roleType);
      }
      return items;
    } catch {
      return INITIAL_PERSONNEL_MEMORY;
    }
  }

  savePersonnelMemory(items: PersonnelMemoryItem[]): void {
    localStorage.setItem(STORAGE_KEYS.PERSONNEL_MEMORY, JSON.stringify(items));
  }

  rememberPersonnel(data: {
    name: string;
    designation: string;
    roleType: PersonnelRole;
    addressOrAffiliation?: string;
    licenseNumber?: string;
  }): PersonnelMemoryItem {
    const cleanName = data.name.trim().toUpperCase();
    const cleanDesignation = data.designation.trim().toUpperCase();
    if (!cleanName) {
      return {
        id: `pm-${Date.now()}`,
        name: cleanName,
        designation: cleanDesignation,
        roleType: data.roleType,
      };
    }

    const items = this.getPersonnelMemory();
    const existingIndex = items.findIndex(
      (p) => p.name.toUpperCase() === cleanName || (cleanName.length > 6 && p.name.toUpperCase().includes(cleanName))
    );

    const now = new Date().toISOString().split('T')[0];

    if (existingIndex >= 0) {
      const existing = items[existingIndex];
      items[existingIndex] = {
        ...existing,
        name: cleanName,
        designation: cleanDesignation || existing.designation,
        roleType: data.roleType || existing.roleType,
        addressOrAffiliation: data.addressOrAffiliation?.trim().toUpperCase() || existing.addressOrAffiliation,
        licenseNumber: data.licenseNumber?.trim().toUpperCase() || existing.licenseNumber,
        usageCount: (existing.usageCount || 1) + 1,
        lastUsedAt: now,
      };
      this.savePersonnelMemory(items);
      return items[existingIndex];
    } else {
      const newItem: PersonnelMemoryItem = {
        id: `pm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        designation: cleanDesignation,
        roleType: data.roleType,
        addressOrAffiliation: data.addressOrAffiliation?.trim().toUpperCase(),
        licenseNumber: data.licenseNumber?.trim().toUpperCase(),
        usageCount: 1,
        lastUsedAt: now,
      };
      items.unshift(newItem);
      this.savePersonnelMemory(items);
      return newItem;
    }
  }

  deletePersonnelMemoryItem(id: string): void {
    const items = this.getPersonnelMemory().filter((p) => p.id !== id);
    this.savePersonnelMemory(items);
  }

  // Full Backup Export
  exportBackup(): string {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      system: 'Civil Registry Information System (CRIS)',
      lgu: this.getSettings().lguName,
      users: this.getUsersRaw(),
      settings: this.getSettings(),
      births: this.getRecords('births'),
      marriages: this.getRecords('marriages'),
      deaths: this.getRecords('deaths'),
      legalInstruments: this.getRecords('legal-instruments'),
      certifications: this.getCertifications(),
      miscRevenue: this.getMiscellaneousRevenue(),
      templates: this.getCertificateTemplates(),
      personnelMemory: this.getPersonnelMemory(),
      auditLogs: this.getAuditLogs(),
      notifications: this.getNotificationsRaw(),
    };

    return JSON.stringify(backupData, null, 2);
  }

  // Full Backup Import
  importBackup(jsonString: string, currentUser: UserAccount): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.births || !parsed.marriages || !parsed.deaths) {
        return { success: false, message: 'Invalid CRIS backup file format. Missing core registry books.' };
      }

      if (parsed.users) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(parsed.users));
      if (parsed.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed.settings));
      if (parsed.births) localStorage.setItem(STORAGE_KEYS.BIRTHS, JSON.stringify(parsed.births));
      if (parsed.marriages) localStorage.setItem(STORAGE_KEYS.MARRIAGES, JSON.stringify(parsed.marriages));
      if (parsed.deaths) localStorage.setItem(STORAGE_KEYS.DEATHS, JSON.stringify(parsed.deaths));
      if (parsed.legalInstruments) localStorage.setItem(STORAGE_KEYS.LEGAL, JSON.stringify(parsed.legalInstruments));
      if (parsed.certifications) localStorage.setItem(STORAGE_KEYS.CERTS, JSON.stringify(parsed.certifications));
      if (parsed.miscRevenue) localStorage.setItem(STORAGE_KEYS.MISC_REVENUE, JSON.stringify(parsed.miscRevenue));
      if (parsed.templates) localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(parsed.templates));
      if (parsed.personnelMemory) localStorage.setItem(STORAGE_KEYS.PERSONNEL_MEMORY, JSON.stringify(parsed.personnelMemory));
      if (parsed.notifications) localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(parsed.notifications));

      this.addAuditLog({
        username: currentUser.username,
        action: 'BACKUP',
        category: 'SYSTEM',
        description: `Restored full system database from backup file dated ${parsed.exportedAt || 'Unknown'}.`,
      });

      this.addNotification({
        title: 'System Database Restored from Backup',
        message: `System archives, records, and registries were successfully restored by ${currentUser.name} (@${currentUser.username}).`,
        type: 'SYSTEM_EVENT',
        priority: 'high',
        recipientUsername: 'all',
        targetRoles: ['superadmin', 'mcr', 'admin'],
        relatedModule: 'settings',
        actionByUsername: currentUser.username,
        actionByName: currentUser.name,
      });

      return { success: true, message: 'CRIS database and book indices successfully restored from backup!' };
    } catch (e: any) {
      return { success: false, message: `Backup restore failed: ${e.message}` };
    }
  }

  // Reset to default factory data
  resetFactoryData(currentUser: UserAccount) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.BIRTHS, JSON.stringify(INITIAL_BIRTHS));
    localStorage.setItem(STORAGE_KEYS.MARRIAGES, JSON.stringify(INITIAL_MARRIAGES));
    localStorage.setItem(STORAGE_KEYS.DEATHS, JSON.stringify(INITIAL_DEATHS));
    localStorage.setItem(STORAGE_KEYS.LEGAL, JSON.stringify(INITIAL_LEGAL_INSTRUMENTS));
    localStorage.setItem(STORAGE_KEYS.CERTS, JSON.stringify(INITIAL_CERTIFICATIONS));
    localStorage.setItem(STORAGE_KEYS.MISC_REVENUE, JSON.stringify(INITIAL_MISC_REVENUE));
    localStorage.setItem(STORAGE_KEYS.PERSONNEL_MEMORY, JSON.stringify(INITIAL_PERSONNEL_MEMORY));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));

    this.addAuditLog({
      username: currentUser.username,
      action: 'BACKUP',
      category: 'SYSTEM',
      description: 'Factory sample books and initial indices restored.',
    });

    this.addNotification({
      title: 'Factory Sample Books & Indices Restored',
      message: `System records reset to default factory data by ${currentUser.name} (@${currentUser.username}).`,
      type: 'SYSTEM_EVENT',
      priority: 'high',
      recipientUsername: 'all',
      targetRoles: ['superadmin', 'mcr'],
      relatedModule: 'settings',
      actionByUsername: currentUser.username,
      actionByName: currentUser.name,
    });
  }

  // ==========================================
  // NOTIFICATION CENTER OPERATIONS & RBAC
  // ==========================================

  private notifySubscribers() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cris:notification_updated'));
    }
  }

  subscribeToNotifications(listener: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = () => listener();
    window.addEventListener('cris:notification_updated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('cris:notification_updated', handler);
      window.removeEventListener('storage', handler);
    };
  }

  getNotificationsRaw(): CrisNotification[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveNotificationsRaw(notifications: CrisNotification[]) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    this.notifySubscribers();
  }

  /**
   * Retrieves notifications with RBAC enforcement and filtering.
   * Only returns notifications the requesting user is authorized to view.
   */
  getNotifications(
    user?: UserAccount | null,
    options?: {
      type?: string;
      readStatus?: 'all' | 'read' | 'unread';
      search?: string;
      limit?: number;
    }
  ): CrisNotification[] {
    const all = this.getNotificationsRaw();
    const currentUser = user || this.getCurrentUser();

    // 1. RBAC & Recipient Filtering
    const visible = all.filter((n) => {
      if (!currentUser) return true;

      // Superadmin has omniscient visibility for system governance
      if (currentUser.role === 'superadmin') return true;

      // User-specific targeting
      if (n.recipientUsername && n.recipientUsername !== 'all' && n.recipientUsername !== currentUser.username) {
        return false;
      }

      // Role targeting
      if (n.targetRoles && n.targetRoles.length > 0) {
        if (!n.targetRoles.includes(currentUser.role)) {
          return false;
        }
      }

      return true;
    });

    // 2. Map dynamic read state for current user
    const withUserReadState = visible.map((n) => {
      let isRead = n.read;
      if (currentUser) {
        if (n.readByUsernames && n.readByUsernames.includes(currentUser.username)) {
          isRead = true;
        } else if (n.recipientUsername === currentUser.username && n.read) {
          isRead = true;
        }
      }
      return {
        ...n,
        read: isRead,
      };
    });

    // 3. Filter by Read Status
    let filtered = withUserReadState;
    if (options?.readStatus === 'unread') {
      filtered = filtered.filter((n) => !n.read);
    } else if (options?.readStatus === 'read') {
      filtered = filtered.filter((n) => n.read);
    }

    // 4. Filter by Notification Type
    if (options?.type && options.type !== 'ALL') {
      filtered = filtered.filter((n) => n.type === options.type);
    }

    // 5. Search by query in Title or Message
    if (options?.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      filtered = filtered.filter(
        (n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      );
    }

    // 6. Sort by newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options?.limit && options.limit > 0) {
      return filtered.slice(0, options.limit);
    }

    return filtered;
  }

  getUnreadCount(user?: UserAccount | null): number {
    const list = this.getNotifications(user, { readStatus: 'unread' });
    return list.length;
  }

  markNotificationAsRead(id: string, user?: UserAccount | null): boolean {
    const all = this.getNotificationsRaw();
    const index = all.findIndex((n) => n.id === id);
    if (index === -1) return false;

    const notif = all[index];
    const username = user?.username || this.getCurrentUser()?.username || 'user';
    const now = new Date().toISOString();

    const readBy = notif.readByUsernames ? [...notif.readByUsernames] : [];
    if (!readBy.includes(username)) {
      readBy.push(username);
    }

    all[index] = {
      ...notif,
      read: true,
      readAt: now,
      readByUsernames: readBy,
    };

    this.saveNotificationsRaw(all);
    return true;
  }

  markAllNotificationsAsRead(user?: UserAccount | null): void {
    const all = this.getNotificationsRaw();
    const currentUser = user || this.getCurrentUser();
    const username = currentUser?.username || 'user';
    const now = new Date().toISOString();

    const updated = all.map((n) => {
      const readBy = n.readByUsernames ? [...n.readByUsernames] : [];
      if (!readBy.includes(username)) {
        readBy.push(username);
      }
      return {
        ...n,
        read: true,
        readAt: now,
        readByUsernames: readBy,
      };
    });

    this.saveNotificationsRaw(updated);
  }

  deleteNotification(id: string, user?: UserAccount | null): boolean {
    const all = this.getNotificationsRaw();
    const target = all.find((n) => n.id === id);
    if (!target) return false;

    const currentUser = user || this.getCurrentUser();
    if (currentUser) {
      // Validate RBAC: superadmin, mcr, and admin can delete notifications.
      // Other users may only delete private notifications addressed to them.
      const isPrivileged = ['superadmin', 'mcr', 'admin'].includes(currentUser.role);
      const isOwner = target.recipientUsername === currentUser.username;
      if (!isPrivileged && !isOwner) {
        throw new Error('Unauthorized: You do not have permission to delete this notification.');
      }
    }

    const filtered = all.filter((n) => n.id !== id);
    this.saveNotificationsRaw(filtered);
    return true;
  }

  bulkDeleteNotifications(ids: string[], user?: UserAccount | null): boolean {
    const all = this.getNotificationsRaw();
    const currentUser = user || this.getCurrentUser();
    const isPrivileged = currentUser ? ['superadmin', 'mcr', 'admin'].includes(currentUser.role) : false;

    const idSet = new Set(ids);
    const filtered = all.filter((n) => {
      if (!idSet.has(n.id)) return true;
      if (isPrivileged) return false;
      if (currentUser && n.recipientUsername === currentUser.username) return false;
      return true;
    });

    this.saveNotificationsRaw(filtered);
    return true;
  }

  addNotification(
    notifData: Omit<CrisNotification, 'id' | 'createdAt' | 'read'> & {
      id?: string;
      createdAt?: string;
      read?: boolean;
    }
  ): CrisNotification {
    const all = this.getNotificationsRaw();
    const id = notifData.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const createdAt = notifData.createdAt || new Date().toISOString();
    const newNotif: CrisNotification = {
      ...notifData,
      id,
      createdAt,
      read: notifData.read ?? false,
      readByUsernames: [],
    };

    all.unshift(newNotif);
    if (all.length > 200) {
      all.length = 200;
    }

    this.saveNotificationsRaw(all);
    return newNotif;
  }

  createAnnouncement(
    announcement: {
      title: string;
      message: string;
      targetRoles?: UserRole[];
      priority?: NotificationPriority;
    },
    author: UserAccount
  ): CrisNotification {
    if (!['superadmin', 'mcr', 'admin'].includes(author.role)) {
      throw new Error('Unauthorized: Only Administrator or MCR can publish official system announcements.');
    }

    return this.addNotification({
      title: announcement.title,
      message: announcement.message,
      type: 'ANNOUNCEMENT',
      priority: announcement.priority || 'high',
      recipientUsername: 'all',
      targetRoles: announcement.targetRoles || ['superadmin', 'mcr', 'admin', 'clerk', 'user'],
      relatedModule: 'settings',
      actionByUsername: author.username,
      actionByName: author.name,
    });
  }
}

export const storageService = new StorageService();

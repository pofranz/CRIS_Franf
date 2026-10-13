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
} from '../types';
import { createDefaultTemplate } from './templates';
import { cloudSyncService } from './cloudSync';

// Sample dummy PDF (Base64 of a minimal valid PDF)
export const SAMPLE_CIVIL_REGISTRY_PDF =
  'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgNSAwIFIKPj4KPj4KZW5kb2JqCjUgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCAyNzQKPj4Kc3RyZWFtCkJUCi9GMSAxNCBUZgoxMDAgNzUwIFRkCihSRVBVQkxJQyBPRiBUSEUgUEhJTElQUElORVMpIFRqCjAgLTIwIFRkCihPRkZJQ0UgT0YgVEhFIE1VTklDSVBBTCBDSVZJTCBSRUdJU1RSQVIpIFRqCjAgLTMwIFRkCi9GMSAxMiBUZgooT0ZGSUNJQUwgQ0lWSUwgUkVHSVNUUlkgQk9PSyBSRUNPUkQgU0NBTikgVGoKMCAtMjUgVGYKKFJlZ2lzdHJ5IEJvb2sgRG9jdW1lbnQgdmVyaWZpZWQgYW5kIGFyY2hpdmVkIGluIENSVVMpIFRqCjAgLTIwIFRkCihUaGlzIGlzIGEgcHJvdmlzaW9uZWQgc2FtcGxlIHNjYW5uZWQgZG9jdW1lbnQgbGlua2VkIHRvIGluZGV4LikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAowMDAwMDAwMjg5IDAwMDAwIG4gCjAwMDAwMDAyMTkgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgowMDAwMDAwNjE1CiUlRU9G';

const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-superadmin',
    username: 'superadmin',
    password: 'password123',
    email: 'admin@culaba.gov.ph',
    number: '09171234567',
    name: 'SYSTEM ADMINISTRATOR',
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
];

const INITIAL_CERTIFICATIONS: IssuedCertification[] = [
  {
    id: 'cert-2026-0001',
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
    }
    if (!localStorage.getItem(STORAGE_KEYS.CERTS)) {
      localStorage.setItem(STORAGE_KEYS.CERTS, JSON.stringify(INITIAL_CERTIFICATIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT)) {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(INITIAL_AUDIT));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PERSONNEL_MEMORY)) {
      localStorage.setItem(STORAGE_KEYS.PERSONNEL_MEMORY, JSON.stringify(INITIAL_PERSONNEL_MEMORY));
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
        if (u.email === 'fjp.culaba@gmail.com') {
          u.email = 'admin@culaba.gov.ph';
          usersUpdated = true;
        }
        if (u.number === '09557213860') {
          u.number = '09171234567';
          usersUpdated = true;
        }
        if (u.role === 'superadmin' && u.name === 'FRANCIS JEFF C. PO') {
          u.name = 'SYSTEM ADMINISTRATOR';
          usersUpdated = true;
        }
      });
      if (usersUpdated) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(rawUsers));
      }

      const currentSession = this.getCurrentUser();
      if (
        currentSession &&
        (currentSession.email === 'fjp.culaba@gmail.com' ||
          currentSession.number === '09557213860' ||
          (currentSession.role === 'superadmin' && currentSession.name === 'FRANCIS JEFF C. PO'))
      ) {
        if (currentSession.email === 'fjp.culaba@gmail.com') currentSession.email = 'admin@culaba.gov.ph';
        if (currentSession.number === '09557213860') currentSession.number = '09171234567';
        if (currentSession.role === 'superadmin' && currentSession.name === 'FRANCIS JEFF C. PO') {
          currentSession.name = 'SYSTEM ADMINISTRATOR';
        }
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
    this.addAuditLog({
      username: this.getCurrentUser()?.username || 'admin',
      action: 'SETTINGS',
      category: 'SYSTEM',
      description: 'Updated Civil Registry Office site configuration and official signatory profile.',
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
      templates: this.getCertificateTemplates(),
      personnelMemory: this.getPersonnelMemory(),
      auditLogs: this.getAuditLogs(),
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
      if (parsed.templates) localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(parsed.templates));
      if (parsed.personnelMemory) localStorage.setItem(STORAGE_KEYS.PERSONNEL_MEMORY, JSON.stringify(parsed.personnelMemory));

      this.addAuditLog({
        username: currentUser.username,
        action: 'BACKUP',
        category: 'SYSTEM',
        description: `Restored full system database from backup file dated ${parsed.exportedAt || 'Unknown'}.`,
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
    localStorage.setItem(STORAGE_KEYS.PERSONNEL_MEMORY, JSON.stringify(INITIAL_PERSONNEL_MEMORY));

    this.addAuditLog({
      username: currentUser.username,
      action: 'BACKUP',
      category: 'SYSTEM',
      description: 'Factory sample books and initial indices restored.',
    });
  }
}

export const storageService = new StorageService();

import React, { useState, useEffect, useRef } from 'react';
import {
  RegistryCategory,
  AnyRegistryRecord,
  BirthRecord,
  MarriageRecord,
  DeathRecord,
  LegalInstrumentRecord,
  UserAccount,
  DocumentAttachment,
  PersonnelMemoryItem,
  PersonnelRole,
} from '../types';
import { storageService } from '../services/storage';
import { formatDateDDMMMYYYY, toInputDateValue } from '../utils/dateUtils';
import {
  X,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Trash2,
  Eye,
  Info,
  UserCheck,
  Stethoscope,
  Baby,
  Heart,
  Scale,
  Plus,
  Search,
  Sparkles,
  ChevronDown,
  Check,
  Receipt,
  DollarSign,
} from 'lucide-react';

interface RecordFormModalProps {
  isOpen: boolean;
  category: RegistryCategory;
  initialRecord?: AnyRegistryRecord | null;
  currentUser: UserAccount;
  onClose: () => void;
  onSave: (record: AnyRegistryRecord) => void;
  onPreviewPdf?: (attachment: DocumentAttachment) => void;
}

const BIRTH_ATTENDANT_DESIGNATIONS = [
  'REGISTERED MIDWIFE',
  'PUBLIC HEALTH MIDWIFE II',
  'RURAL HEALTH MIDWIFE',
  'STAFF NURSE',
  'PUBLIC HEALTH NURSE I',
  'MUNICIPAL HEALTH OFFICER',
  'ATTENDING PHYSICIAN',
  'TRADITIONAL BIRTH ATTENDANT (HILOT)',
];

const DEATH_CERTIFIER_DESIGNATIONS = [
  'MUNICIPAL HEALTH OFFICER',
  'ATTENDING PHYSICIAN',
  'MEDICAL OFFICER IV',
  'RURAL HEALTH PHYSICIAN',
  'CHIEF OF HOSPITAL',
  'PATHOLOGIST',
];

const SOLEMNIZING_OFFICER_DESIGNATIONS = [
  'ACTING PRESIDING JUDGE, MTC',
  'PRESIDING JUDGE',
  'REGIONAL TRIAL COURT JUDGE',
  'PARISH PRIEST',
  'ORDAINED RESIDENT MINISTER',
  'MUNICIPAL MAYOR',
  'PASTOR',
];

const getRoleBadge = (role: PersonnelRole) => {
  switch (role) {
    case 'doctor':
      return { label: 'DOCTOR', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80' };
    case 'midwife':
      return { label: 'MIDWIFE', color: 'bg-teal-950/80 text-teal-300 border-teal-800/80' };
    case 'nurse':
      return { label: 'NURSE', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80' };
    case 'solemnizing_officer':
      return { label: 'SOLEMNIZING', color: 'bg-purple-950/80 text-purple-300 border-purple-800/80' };
    case 'mcr':
      return { label: 'MCR', color: 'bg-amber-950/80 text-amber-300 border-amber-800/80' };
    default:
      return { label: 'OFFICER', color: 'bg-slate-800 text-slate-300 border-slate-700' };
  }
};

interface PersonnelAutocompleteFieldProps {
  label: string;
  nameValue: string;
  onNameChange: (val: string) => void;
  designationValue: string;
  onDesignationChange: (val: string) => void;
  onSelectPerson?: (person: PersonnelMemoryItem) => void;
  primaryRoles: PersonnelRole[];
  allPersonnel: PersonnelMemoryItem[];
  placeholderName?: string;
  placeholderTitle?: string;
  commonDesignations?: string[];
  helperHint?: string;
}

const PersonnelAutocompleteField: React.FC<PersonnelAutocompleteFieldProps> = ({
  label,
  nameValue,
  onNameChange,
  designationValue,
  onDesignationChange,
  onSelectPerson,
  primaryRoles,
  allPersonnel,
  placeholderName = 'FULL NAME',
  placeholderTitle = 'OFFICIAL DESIGNATION',
  commonDesignations = [],
  helperHint,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [roleFilterTab, setRoleFilterTab] = useState<'primary' | 'all'>('primary');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toUpper = (val: string) => val.toUpperCase();

  const filteredList = allPersonnel.filter((person) => {
    if (roleFilterTab === 'primary' && !primaryRoles.includes(person.roleType)) {
      return false;
    }
    if (!nameValue.trim()) return true;
    const query = nameValue.toUpperCase().trim();
    return (
      person.name.toUpperCase().includes(query) ||
      person.designation.toUpperCase().includes(query) ||
      (person.addressOrAffiliation && person.addressOrAffiliation.toUpperCase().includes(query))
    );
  });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Name input with Autocomplete */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold text-slate-300">{label}</label>
            <span className="text-[10px] text-blue-400 flex items-center gap-1 font-mono">
              <Sparkles className="w-3 h-3 text-amber-400 inline" />
              Autocomplete
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={nameValue}
              onChange={(e) => {
                onNameChange(toUpper(e.target.value));
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholderName}
              className="w-full px-3 py-1.5 pr-8 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              title="Toggle suggestions"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-64 flex flex-col animate-in fade-in zoom-in-95 duration-100">
              <div className="p-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-400" />
                  Remembered Personnel
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setRoleFilterTab('primary');
                    }}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      roleFilterTab === 'primary'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Relevant
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setRoleFilterTab('all');
                    }}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      roleFilterTab === 'all'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({allPersonnel.length})
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60 p-1">
                {filteredList.length > 0 ? (
                  filteredList.map((person) => {
                    const badge = getRoleBadge(person.roleType);
                    const isSelected = nameValue.toUpperCase() === person.name.toUpperCase();
                    return (
                      <button
                        key={person.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onNameChange(person.name);
                          onDesignationChange(person.designation);
                          if (onSelectPerson) onSelectPerson(person);
                          setIsOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg transition flex items-start justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-900/40 text-blue-200 border border-blue-700/50'
                            : 'hover:bg-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-bold text-xs text-white uppercase tracking-tight">
                              {person.name}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-emerald-300 font-mono flex items-center gap-1.5">
                            <span>{person.designation}</span>
                            {person.addressOrAffiliation && (
                              <span className="text-slate-400 text-[10px] truncate max-w-[180px]">
                                • {person.addressOrAffiliation}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {person.usageCount ? (
                            <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                              Used {person.usageCount}x
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400">
                    <p className="font-medium text-slate-300 mb-1">No matching saved personnel.</p>
                    <p className="text-[11px] text-slate-400">
                      Type a custom name and designation. CRIS will remember it for future autocomplete upon saving.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Title / Designation input with quick pills */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Title / Official Designation
          </label>
          <input
            type="text"
            value={designationValue}
            onChange={(e) => onDesignationChange(toUpper(e.target.value))}
            placeholder={placeholderTitle}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
          />

          {commonDesignations.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-1.5">
              <span className="text-[9px] text-slate-400 uppercase font-mono mr-1">Quick:</span>
              {commonDesignations.map((desig) => (
                <button
                  key={desig}
                  type="button"
                  onClick={() => onDesignationChange(desig)}
                  className={`text-[9px] px-1.5 py-0.5 rounded transition cursor-pointer font-mono ${
                    designationValue.toUpperCase() === desig.toUpperCase()
                      ? 'bg-emerald-800 text-white font-bold border border-emerald-600'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {desig}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {helperHint && <p className="text-[10px] text-slate-400 italic">{helperHint}</p>}
    </div>
  );
};

export const RecordFormModal: React.FC<RecordFormModalProps> = ({
  isOpen,
  category: defaultCategory,
  initialRecord,
  currentUser,
  onClose,
  onSave,
  onPreviewPdf,
}) => {
  const [category, setCategory] = useState<RegistryCategory>(defaultCategory);
  const [isSelectingType, setIsSelectingType] = useState<boolean>(!initialRecord);
  const [activeStep, setActiveStep] = useState<'book' | 'details' | 'parents_or_parties' | 'solemnizing_or_cause' | 'attachment'>('book');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Common Fields
  const [bookNumber, setBookNumber] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [registryNumber, setRegistryNumber] = useState('');
  const [registryDate, setRegistryDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attachment, setAttachment] = useState<DocumentAttachment | undefined>(undefined);

  // Birth specific
  const [childName, setChildName] = useState('');
  const [childSex, setChildSex] = useState<'MALE' | 'FEMALE'>('MALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [typeOfBirth, setTypeOfBirth] = useState<'SINGLE' | 'TWIN' | 'TRIPLET' | 'MULTIPLE'>('SINGLE');
  const [birthOrder, setBirthOrder] = useState('FIRST');
  const [motherMaidenName, setMotherMaidenName] = useState('');
  const [ageAtBirthOfMother, setAgeAtBirthOfMother] = useState('');
  const [nationalityOfMother, setNationalityOfMother] = useState('FILIPINO');
  const [religionOfMother, setReligionOfMother] = useState('ROMAN CATHOLIC');
  const [fatherName, setFatherName] = useState('');
  const [ageAtBirthOfFather, setAgeAtBirthOfFather] = useState('');
  const [nationalityOfFather, setNationalityOfFather] = useState('FILIPINO');
  const [religionOfFather, setReligionOfFather] = useState('ROMAN CATHOLIC');
  const [parentsDateOfMarriage, setParentsDateOfMarriage] = useState('');
  const [parentsPlaceOfMarriage, setParentsPlaceOfMarriage] = useState('');

  // Marriage specific
  const [wifeName, setWifeName] = useState('');
  const [wifeAge, setWifeAge] = useState('');
  const [wifeNationality, setWifeNationality] = useState('FILIPINO');
  const [wifeCivilStatus, setWifeCivilStatus] = useState('SINGLE');
  const [wifeResidence, setWifeResidence] = useState('');
  const [wifeFatherName, setWifeFatherName] = useState('');
  const [wifeFatherNationality, setWifeFatherNationality] = useState('FILIPINO');
  const [wifeMotherName, setWifeMotherName] = useState('');
  const [wifeMotherNationality, setWifeMotherNationality] = useState('FILIPINO');
  const [wifeConsentName, setWifeConsentName] = useState('N/A');
  const [wifeConsentAddress, setWifeConsentAddress] = useState('N/A');
  const [wifeConsentRelation, setWifeConsentRelation] = useState('N/A');

  const [husbandName, setHusbandName] = useState('');
  const [husbandAge, setHusbandAge] = useState('');
  const [husbandNationality, setHusbandNationality] = useState('FILIPINO');
  const [husbandCivilStatus, setHusbandCivilStatus] = useState('SINGLE');
  const [husbandResidence, setHusbandResidence] = useState('');
  const [husbandFatherName, setHusbandFatherName] = useState('');
  const [husbandFatherNationality, setHusbandFatherNationality] = useState('FILIPINO');
  const [husbandMotherName, setHusbandMotherName] = useState('');
  const [husbandMotherNationality, setHusbandMotherNationality] = useState('FILIPINO');
  const [husbandConsentName, setHusbandConsentName] = useState('N/A');
  const [husbandConsentAddress, setHusbandConsentAddress] = useState('N/A');
  const [husbandConsentRelation, setHusbandConsentRelation] = useState('N/A');

  const [marriagePlace, setMarriagePlace] = useState('');
  const [marriageDate, setMarriageDate] = useState('');
  const [marriageTime, setMarriageTime] = useState('');
  const [solemnizingOfficer, setSolemnizingOfficer] = useState('');
  const [solemnizingTitle, setSolemnizingTitle] = useState('');
  const [solemnizingAddress, setSolemnizingAddress] = useState('');
  const [witness1Name, setWitness1Name] = useState('');
  const [witness1Residence, setWitness1Residence] = useState('');
  const [witness2Name, setWitness2Name] = useState('');
  const [witness2Residence, setWitness2Residence] = useState('');
  const [dateOfReceipt, setDateOfReceipt] = useState('');

  // Death specific
  const [deceasedName, setDeceasedName] = useState('');
  const [deceasedSex, setDeceasedSex] = useState<'MALE' | 'FEMALE'>('MALE');
  const [ageYears, setAgeYears] = useState('');
  const [ageMonths, setAgeMonths] = useState('');
  const [ageDays, setAgeDays] = useState('');
  const [ageHours, setAgeHours] = useState('');
  const [fetalDeath, setFetalDeath] = useState<'YES' | 'NO'>('NO');
  const [deathCivilStatus, setDeathCivilStatus] = useState('MARRIED');
  const [deathNationality, setDeathNationality] = useState('FILIPINO');
  const [usualOccupation, setUsualOccupation] = useState('');
  const [usualResidence, setUsualResidence] = useState('');
  const [deathDay, setDeathDay] = useState('');
  const [deathMonth, setDeathMonth] = useState('');
  const [deathYear, setDeathYear] = useState('');
  const [deathTime, setDeathTime] = useState('');
  const [placeOfDeath, setPlaceOfDeath] = useState('');
  const [causeImmediate, setCauseImmediate] = useState('');
  const [causeUnderlying, setCauseUnderlying] = useState('');
  const [certifyingOfficerName, setCertifyingOfficerName] = useState('');
  const [certifyingOfficerTitle, setCertifyingOfficerTitle] = useState('MUNICIPAL HEALTH OFFICER');

  // Birth Attendant
  const [attendantName, setAttendantName] = useState('');
  const [attendantTitle, setAttendantTitle] = useState('REGISTERED MIDWIFE');

  // Personnel Memory State & Directory modal
  const [personnelList, setPersonnelList] = useState<PersonnelMemoryItem[]>([]);
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [directoryFilter, setDirectoryFilter] = useState<'all' | PersonnelRole>('all');
  const [directorySearch, setDirectorySearch] = useState('');
  const [showAddPersonnelForm, setShowAddPersonnelForm] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonDesignation, setNewPersonDesignation] = useState('');
  const [newPersonRole, setNewPersonRole] = useState<PersonnelRole>('doctor');
  const [newPersonAffiliation, setNewPersonAffiliation] = useState('');

  // Legal Instrument specific
  const [legalType, setLegalType] = useState('AFFIDAVIT OF ACKNOWLEDGMENT');
  const [legalSubjectName, setLegalSubjectName] = useState('');
  const [legalOrNumber, setLegalOrNumber] = useState('');
  const [legalAmountPaid, setLegalAmountPaid] = useState('200.00');

  // Format Helper: STRICT CAPITALIZATION
  const toUpper = (val: string) => val.toUpperCase();

  // Reset or Populate form on open
  useEffect(() => {
    if (!isOpen) return;

    // Load active personnel memory directory
    setPersonnelList(storageService.getPersonnelMemory());
    setIsSelectingType(!initialRecord);

    if (initialRecord) {
      setCategory(initialRecord.category);
      setBookNumber(initialRecord.bookNumber || '');
      setPageNumber(initialRecord.pageNumber || '');
      setRegistryNumber(initialRecord.registryNumber || '');
      setRegistryDate(toInputDateValue(initialRecord.registryDate || (initialRecord as any).dateOfRegistration || ''));
      setRemarks(initialRecord.remarks || '');
      setAttachment(initialRecord.pdfAttachment);

      if (initialRecord.category === 'births') {
        const b = initialRecord as BirthRecord;
        setChildName(b.name || '');
        setChildSex(b.sex || 'MALE');
        setDateOfBirth(toInputDateValue(b.dateOfBirth || ''));
        setPlaceOfBirth(b.placeOfBirth || '');
        setTypeOfBirth(b.typeOfBirth || 'SINGLE');
        setBirthOrder(b.birthOrder || 'FIRST');
        setMotherMaidenName(b.motherMaidenName || '');
        setAgeAtBirthOfMother(b.ageAtBirthOfMother || '');
        setNationalityOfMother(b.nationalityOfMother || 'FILIPINO');
        setReligionOfMother(b.religionOfMother || 'ROMAN CATHOLIC');
        setFatherName(b.fatherName || '');
        setAgeAtBirthOfFather(b.ageAtBirthOfFather || '');
        setNationalityOfFather(b.nationalityOfFather || 'FILIPINO');
        setReligionOfFather(b.religionOfFather || 'ROMAN CATHOLIC');
        setParentsDateOfMarriage(toInputDateValue(b.dateOfMarriage || ''));
        setParentsPlaceOfMarriage(b.placeOfMarriage || '');
        setAttendantName(b.attendantName || '');
        setAttendantTitle(b.attendantTitle || 'REGISTERED MIDWIFE');
      } else if (initialRecord.category === 'marriages') {
        const m = initialRecord as MarriageRecord;
        setWifeName(m.wifeName || '');
        setWifeAge(m.wifeAge || '');
        setWifeNationality(m.wifeNationality || 'FILIPINO');
        setWifeCivilStatus(m.wifeCivilStatus || 'SINGLE');
        setWifeResidence(m.wifeResidence || '');
        setWifeFatherName(m.wifeFatherName || '');
        setWifeFatherNationality(m.wifeFatherNationality || 'FILIPINO');
        setWifeMotherName(m.wifeMotherName || '');
        setWifeMotherNationality(m.wifeMotherNationality || 'FILIPINO');
        setWifeConsentName(m.wifePersonWhoGiveConsentName || 'N/A');
        setWifeConsentAddress(m.wifePersonWhoGiveConsentAddress || 'N/A');
        setWifeConsentRelation(m.wifePersonWhoGiveConsentRelation || 'N/A');

        setHusbandName(m.husbandName || '');
        setHusbandAge(m.husbandAge || '');
        setHusbandNationality(m.husbandNationality || 'FILIPINO');
        setHusbandCivilStatus(m.husbandCivilStatus || 'SINGLE');
        setHusbandResidence(m.husbandResidence || '');
        setHusbandFatherName(m.husbandFatherName || '');
        setHusbandFatherNationality(m.husbandFatherNationality || 'FILIPINO');
        setHusbandMotherName(m.husbandMotherName || '');
        setHusbandMotherNationality(m.husbandMotherNationality || 'FILIPINO');
        setHusbandConsentName(m.husbandPersonWhoGiveConsentName || 'N/A');
        setHusbandConsentAddress(m.husbandPersonWhoGiveConsentAddress || 'N/A');
        setHusbandConsentRelation(m.husbandPersonWhoGiveConsentRelation || 'N/A');

        setMarriagePlace(m.placeOfMarriage || '');
        setMarriageDate(toInputDateValue(m.dateOfMarriage || ''));
        setMarriageTime(m.timeOfMarriage || '');
        setSolemnizingOfficer(m.solemnizingOfficer || '');
        setSolemnizingTitle(m.solemnizingTitle || '');
        setSolemnizingAddress(m.solemnizingAddress || '');
        setWitness1Name(m.witness1Name || '');
        setWitness1Residence(m.witness1Residence || '');
        setWitness2Name(m.witness2Name || '');
        setWitness2Residence(m.witness2Residence || '');
        setDateOfReceipt(toInputDateValue(m.dateOfReceipt || ''));
      } else if (initialRecord.category === 'deaths') {
        const d = initialRecord as DeathRecord;
        setDeceasedName(d.nameOfDeceased || '');
        setDeceasedSex(d.sex || 'MALE');
        setAgeYears(d.ageYears || '');
        setAgeMonths(d.ageMonths || '');
        setAgeDays(d.ageDays || '');
        setAgeHours(d.ageHours || '');
        setFetalDeath(d.fetalDeath || 'NO');
        setDeathCivilStatus(d.civilStatus || 'MARRIED');
        setDeathNationality(d.nationality || 'FILIPINO');
        setUsualOccupation(d.usualOccupation || '');
        setUsualResidence(d.usualResidence || '');
        setDeathDay(d.dateOfDeathDay || '');
        setDeathMonth(d.dateOfDeathMonth || '');
        setDeathYear(d.dateOfDeathYear || '');
        setDeathTime(d.timeOfDeath || '');
        setPlaceOfDeath(d.placeOfDeath || '');
        setCauseImmediate(d.causeOfDeathImmediate || '');
        setCauseUnderlying(d.causeOfDeathUnderlying || '');
        setCertifyingOfficerName(d.certifyingOfficerName || '');
        setCertifyingOfficerTitle(d.certifyingOfficerTitle || 'MUNICIPAL HEALTH OFFICER');
      } else if (initialRecord.category === 'legal-instruments') {
        const l = initialRecord as LegalInstrumentRecord;
        setLegalType(l.typeOfLegalInstrument || 'AFFIDAVIT OF ACKNOWLEDGMENT');
        setLegalSubjectName(l.name || '');
        setLegalOrNumber(l.orNumber || '');
        setLegalAmountPaid(l.amountPaid || '200.00');
      }
    } else {
      setCategory(defaultCategory);
      setBookNumber('');
      setPageNumber('');
      setRegistryNumber('');
      setRegistryDate(new Date().toISOString().split('T')[0]);
      setRemarks('');
      setAttachment(undefined);

      // Default Births
      setChildName('');
      setChildSex('MALE');
      setDateOfBirth(new Date().toISOString().split('T')[0]);
      setPlaceOfBirth('CULABA RURAL HEALTH UNIT, CULABA, BILIRAN');
      setTypeOfBirth('SINGLE');
      setBirthOrder('FIRST');
      setMotherMaidenName('');
      setAgeAtBirthOfMother('');
      setFatherName('');
      setAgeAtBirthOfFather('');
      setParentsDateOfMarriage('');
      setParentsPlaceOfMarriage('CULABA, BILIRAN');
      setAttendantName('');
      setAttendantTitle('REGISTERED MIDWIFE');

      // Default Marriages
      setWifeName('');
      setWifeAge('');
      setWifeResidence('CULABA, BILIRAN');
      setHusbandName('');
      setHusbandAge('');
      setHusbandResidence('CULABA, BILIRAN');
      setMarriagePlace('MTC CULABA, BILIRAN');
      setMarriageDate(new Date().toISOString().split('T')[0]);
      setMarriageTime('10:00 AM');
      setSolemnizingOfficer('');
      setSolemnizingTitle('PRESIDING JUDGE');
      setSolemnizingAddress('CULABA, BILIRAN');
      setWitness1Name('');
      setWitness1Residence('CULABA, BILIRAN');
      setWitness2Name('');
      setWitness2Residence('CULABA, BILIRAN');
      setDateOfReceipt(new Date().toISOString().split('T')[0]);

      // Default Deaths
      setDeceasedName('');
      setDeceasedSex('MALE');
      setAgeYears('65');
      setAgeMonths('0');
      setAgeDays('0');
      setAgeHours('0');
      setDeathDay(new Date().getDate().toString().padStart(2, '0'));
      setDeathMonth((new Date().getMonth() + 1).toString().padStart(2, '0'));
      setDeathYear(new Date().getFullYear().toString());
      setDeathTime('08:00 AM');
      setPlaceOfDeath('CULABA, BILIRAN');
      setCauseImmediate('');
      setCauseUnderlying('');
      setCertifyingOfficerName('');
      setCertifyingOfficerTitle('MUNICIPAL HEALTH OFFICER');

      // Default Legal
      setLegalType('AFFIDAVIT OF ACKNOWLEDGMENT');
      setLegalSubjectName('');
      setLegalOrNumber('');
      setLegalAmountPaid('200.00');
    }
    setActiveStep('book');
    setErrorMessage('');
  }, [isOpen, initialRecord, defaultCategory]);

  if (!isOpen) return null;

  // File Upload Handler for PDF linked to index
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please upload a PDF document file (.pdf) for civil registry document archiving.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('PDF file is too large. Maximum allowed size is 20MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      setAttachment({
        name: file.name.toUpperCase(),
        size: file.size,
        type: 'application/pdf',
        dataUrl,
        uploadedAt: now,
        uploadedBy: currentUser.username,
      });
      setErrorMessage('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation
    if (!registryNumber.trim()) {
      setErrorMessage('Registry Number is required to index civil registry records. (Book & Page may be omitted).');
      setActiveStep('book');
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const id = initialRecord ? initialRecord.id : `${category}-${Date.now()}`;
    const usernameAdded = initialRecord ? initialRecord.usernameAdded : currentUser.username;
    const firstAddedDateTime = initialRecord ? initialRecord.firstAddedDateTime : now;
    const versions = initialRecord ? initialRecord.versions : [
      {
        version: 1,
        modifiedAt: now,
        modifiedBy: currentUser.username,
        changesSummary: 'INITIAL ENTRY CREATION',
        snapshot: {},
      },
    ];

    let newRecord: AnyRegistryRecord;

    if (category === 'births') {
      if (!childName.trim()) {
        setErrorMessage('Child Name is required for Birth Registry.');
        setActiveStep('details');
        return;
      }
      const birth: BirthRecord = {
        id,
        category: 'births',
        bookNumber: toUpper(bookNumber.trim()),
        pageNumber: toUpper(pageNumber.trim()),
        registryNumber: toUpper(registryNumber.trim()),
        registryDate: registryDate || now.split(' ')[0],
        remarks: toUpper(remarks.trim()),
        usernameAdded,
        firstAddedDateTime,
        updatedAt: now,
        updatedBy: currentUser.username,
        versions,
        pdfAttachment: attachment,
        name: toUpper(childName.trim()),
        sex: childSex,
        dateOfBirth: dateOfBirth,
        placeOfBirth: toUpper(placeOfBirth.trim()),
        typeOfBirth,
        birthOrder: toUpper(birthOrder.trim()),
        motherMaidenName: toUpper(motherMaidenName.trim()),
        ageAtBirthOfMother: ageAtBirthOfMother.trim(),
        nationalityOfMother: toUpper(nationalityOfMother.trim()),
        religionOfMother: toUpper(religionOfMother.trim()),
        fatherName: toUpper(fatherName.trim()),
        ageAtBirthOfFather: ageAtBirthOfFather.trim(),
        nationalityOfFather: toUpper(nationalityOfFather.trim()),
        religionOfFather: toUpper(religionOfFather.trim()),
        dateOfMarriage: parentsDateOfMarriage,
        placeOfMarriage: toUpper(parentsPlaceOfMarriage.trim()),
        attendantName: toUpper(attendantName.trim()),
        attendantTitle: toUpper(attendantTitle.trim()),
      };
      if (attendantName.trim()) {
        const titleLower = attendantTitle.toLowerCase();
        const role: PersonnelRole = titleLower.includes('nurse')
          ? 'nurse'
          : titleLower.includes('midwife')
          ? 'midwife'
          : titleLower.includes('doctor') || titleLower.includes('m.d.') || titleLower.includes('physician')
          ? 'doctor'
          : 'midwife';
        storageService.rememberPersonnel({
          name: toUpper(attendantName.trim()),
          designation: toUpper(attendantTitle.trim()) || 'ATTENDANT AT BIRTH',
          roleType: role,
        });
        setPersonnelList(storageService.getPersonnelMemory());
      }
      newRecord = birth;
    } else if (category === 'marriages') {
      if (!wifeName.trim() || !husbandName.trim()) {
        setErrorMessage('Both Husband Name and Wife Name are required for Marriage Registry.');
        setActiveStep('details');
        return;
      }
      const marriage: MarriageRecord = {
        id,
        category: 'marriages',
        bookNumber: toUpper(bookNumber.trim()),
        pageNumber: toUpper(pageNumber.trim()),
        registryNumber: toUpper(registryNumber.trim()),
        registryDate: registryDate || now.split(' ')[0],
        dateOfRegistration: registryDate || now.split(' ')[0],
        remarks: toUpper(remarks.trim()),
        usernameAdded,
        firstAddedDateTime,
        updatedAt: now,
        updatedBy: currentUser.username,
        versions,
        pdfAttachment: attachment,
        wifeName: toUpper(wifeName.trim()),
        wifeAge: wifeAge.trim(),
        wifeNationality: toUpper(wifeNationality.trim()),
        wifeCivilStatus: toUpper(wifeCivilStatus.trim()),
        wifeResidence: toUpper(wifeResidence.trim()),
        wifeFatherName: toUpper(wifeFatherName.trim()),
        wifeFatherNationality: toUpper(wifeFatherNationality.trim()),
        wifeMotherName: toUpper(wifeMotherName.trim()),
        wifeMotherNationality: toUpper(wifeMotherNationality.trim()),
        wifePersonWhoGiveConsentName: toUpper(wifeConsentName.trim()),
        wifePersonWhoGiveConsentAddress: toUpper(wifeConsentAddress.trim()),
        wifePersonWhoGiveConsentRelation: toUpper(wifeConsentRelation.trim()),
        husbandName: toUpper(husbandName.trim()),
        husbandAge: husbandAge.trim(),
        husbandNationality: toUpper(husbandNationality.trim()),
        husbandCivilStatus: toUpper(husbandCivilStatus.trim()),
        husbandResidence: toUpper(husbandResidence.trim()),
        husbandFatherName: toUpper(husbandFatherName.trim()),
        husbandFatherNationality: toUpper(husbandFatherNationality.trim()),
        husbandMotherName: toUpper(husbandMotherName.trim()),
        husbandMotherNationality: toUpper(husbandMotherNationality.trim()),
        husbandPersonWhoGiveConsentName: toUpper(husbandConsentName.trim()),
        husbandPersonWhoGiveConsentAddress: toUpper(husbandConsentAddress.trim()),
        husbandPersonWhoGiveConsentRelation: toUpper(husbandConsentRelation.trim()),
        placeOfMarriage: toUpper(marriagePlace.trim()),
        dateOfMarriage: marriageDate,
        timeOfMarriage: toUpper(marriageTime.trim()),
        solemnizingOfficer: toUpper(solemnizingOfficer.trim()),
        solemnizingTitle: toUpper(solemnizingTitle.trim()),
        solemnizingAddress: toUpper(solemnizingAddress.trim()),
        witness1Name: toUpper(witness1Name.trim()),
        witness1Residence: toUpper(witness1Residence.trim()),
        witness2Name: toUpper(witness2Name.trim()),
        witness2Residence: toUpper(witness2Residence.trim()),
        dateOfReceipt: dateOfReceipt,
      };
      if (solemnizingOfficer.trim()) {
        storageService.rememberPersonnel({
          name: toUpper(solemnizingOfficer.trim()),
          designation: toUpper(solemnizingTitle.trim()) || 'SOLEMNIZING OFFICER',
          roleType: 'solemnizing_officer',
          addressOrAffiliation: toUpper(solemnizingAddress.trim()),
        });
        setPersonnelList(storageService.getPersonnelMemory());
      }
      newRecord = marriage;
    } else if (category === 'deaths') {
      if (!deceasedName.trim()) {
        setErrorMessage('Name of Deceased is required for Death Registry.');
        setActiveStep('details');
        return;
      }
      const death: DeathRecord = {
        id,
        category: 'deaths',
        bookNumber: toUpper(bookNumber.trim()),
        pageNumber: toUpper(pageNumber.trim()),
        registryNumber: toUpper(registryNumber.trim()),
        registryDate: registryDate || now.split(' ')[0],
        dateOfRegistration: registryDate || now.split(' ')[0],
        remarks: toUpper(remarks.trim()),
        usernameAdded,
        firstAddedDateTime,
        updatedAt: now,
        updatedBy: currentUser.username,
        versions,
        pdfAttachment: attachment,
        nameOfDeceased: toUpper(deceasedName.trim()),
        sex: deceasedSex,
        ageYears: ageYears.trim(),
        ageMonths: ageMonths.trim(),
        ageDays: ageDays.trim(),
        ageHours: ageHours.trim(),
        fetalDeath: fetalDeath,
        civilStatus: toUpper(deathCivilStatus.trim()),
        nationality: toUpper(deathNationality.trim()),
        usualOccupation: toUpper(usualOccupation.trim()),
        usualResidence: toUpper(usualResidence.trim()),
        dateOfDeathDay: deathDay.trim(),
        dateOfDeathMonth: deathMonth.trim(),
        dateOfDeathYear: deathYear.trim(),
        timeOfDeath: toUpper(deathTime.trim()),
        placeOfDeath: toUpper(placeOfDeath.trim()),
        causeOfDeathImmediate: toUpper(causeImmediate.trim()),
        causeOfDeathUnderlying: toUpper(causeUnderlying.trim()),
        certifyingOfficerName: toUpper(certifyingOfficerName.trim()),
        certifyingOfficerTitle: toUpper(certifyingOfficerTitle.trim()),
      };
      if (certifyingOfficerName.trim()) {
        storageService.rememberPersonnel({
          name: toUpper(certifyingOfficerName.trim()),
          designation: toUpper(certifyingOfficerTitle.trim()) || 'MUNICIPAL HEALTH OFFICER',
          roleType: 'doctor',
        });
        setPersonnelList(storageService.getPersonnelMemory());
      }
      newRecord = death;
    } else {
      // Legal Instruments
      if (!legalSubjectName.trim()) {
        setErrorMessage('Party/Subject Name is required for Legal Instrument.');
        setActiveStep('details');
        return;
      }
      const legal: LegalInstrumentRecord = {
        id,
        category: 'legal-instruments',
        bookNumber: toUpper(bookNumber.trim()),
        pageNumber: toUpper(pageNumber.trim()),
        registryNumber: toUpper(registryNumber.trim()),
        registryDate: registryDate || now.split(' ')[0],
        dateOfRegistration: registryDate || now.split(' ')[0],
        remarks: toUpper(remarks.trim()),
        usernameAdded,
        firstAddedDateTime,
        updatedAt: now,
        updatedBy: currentUser.username,
        versions,
        pdfAttachment: attachment,
        typeOfLegalInstrument: toUpper(legalType.trim()),
        name: toUpper(legalSubjectName.trim()),
        orNumber: legalOrNumber.trim() ? toUpper(legalOrNumber.trim()) : undefined,
        amountPaid: legalAmountPaid.trim() ? legalAmountPaid.trim() : undefined,
      };
      newRecord = legal;
    }

    onSave(newRecord);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>
                  {initialRecord
                    ? 'Edit Index Record'
                    : isSelectingType
                    ? 'Select Registry Record Type'
                    : 'Create New Civil Registry Index'}
                </span>
                {!isSelectingType && (
                  <span className="text-[10px] bg-blue-900/60 text-blue-300 border border-blue-700/60 px-2 py-0.5 rounded font-mono uppercase">
                    {category.replace('-', ' ')}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {isSelectingType
                  ? 'Select the civil registry book to index. Your active workspace tab will remain unchanged.'
                  : 'All entries will be automatically standardized into CAPITAL LETTERS (PSA / LCR standard).'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPersonnelList(storageService.getPersonnelMemory());
                setShowDirectoryModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition cursor-pointer shadow-xs"
              title="View & manage remembered doctors, nurses, midwives, MCRs, and solemnizing officers"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Personnel Memory Bank</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Type Selection View OR Indexing Form */}
        {!initialRecord && isSelectingType ? (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="text-center max-w-lg mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/80 mb-3">
                <FileText className="w-3.5 h-3.5" />
                Civil Registry Indexing
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                What kind of record do you want to create?
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Select the civil registry book to index. Your active workspace tab will remain unchanged.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* Birth Registry */}
              <button
                type="button"
                onClick={() => {
                  setCategory('births');
                  setActiveStep('book');
                  setIsSelectingType(false);
                }}
                className="group relative p-5 bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/60 rounded-xl text-left transition duration-150 cursor-pointer shadow-sm hover:shadow-md hover:shadow-blue-950/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-950/80 border border-blue-800/80 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                      <Baby className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded">
                      LCR FORM 1A
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition">
                    Birth Registry
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Certificate of Live Birth • Child particulars, parentage, birth order, attendant at birth.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 mt-4 group-hover:translate-x-0.5 transition">
                  Create Birth Record →
                </span>
              </button>

              {/* Marriage Registry */}
              <button
                type="button"
                onClick={() => {
                  setCategory('marriages');
                  setActiveStep('book');
                  setIsSelectingType(false);
                }}
                className="group relative p-5 bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-pink-500/60 rounded-xl text-left transition duration-150 cursor-pointer shadow-sm hover:shadow-md hover:shadow-pink-950/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-950/80 border border-pink-800/80 text-pink-400 flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition">
                      <Heart className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-pink-400 bg-pink-950/60 border border-pink-800/60 px-2 py-0.5 rounded">
                      LCR FORM 2A
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition">
                    Marriage Registry
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Certificate of Marriage • Contracting parties, parents, solemnizing officer, witnesses.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-400 mt-4 group-hover:translate-x-0.5 transition">
                  Create Marriage Record →
                </span>
              </button>

              {/* Death Registry */}
              <button
                type="button"
                onClick={() => {
                  setCategory('deaths');
                  setActiveStep('book');
                  setIsSelectingType(false);
                }}
                className="group relative p-5 bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/60 rounded-xl text-left transition duration-150 cursor-pointer shadow-sm hover:shadow-md hover:shadow-amber-950/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                      LCR FORM 3A
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                    Death Registry
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Certificate of Death • Deceased details, causes of death, medical certifying officer.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 mt-4 group-hover:translate-x-0.5 transition">
                  Create Death Record →
                </span>
              </button>

              {/* Legal Instruments */}
              <button
                type="button"
                onClick={() => {
                  setCategory('legal-instruments');
                  setActiveStep('book');
                  setIsSelectingType(false);
                }}
                className="group relative p-5 bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/60 rounded-xl text-left transition duration-150 cursor-pointer shadow-sm hover:shadow-md hover:shadow-indigo-950/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/80 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                      <Scale className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded">
                      ACT 3753
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                    Legal Instruments
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Affidavits & Court Decrees • Acknowledgment, Legitimation, AUSF, Adoption, Annulment.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 mt-4 group-hover:translate-x-0.5 transition">
                  Create Legal Instrument →
                </span>
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
        {/* Section Tabs for Clean Navigation */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-2 flex items-center gap-2 text-xs overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveStep('book')}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
              activeStep === 'book'
                ? 'bg-slate-800 text-blue-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Book, Page & Registry
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('details')}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
              activeStep === 'details'
                ? 'bg-slate-800 text-blue-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Primary Subject Details
          </button>
          {category !== 'legal-instruments' && (
            <button
              type="button"
              onClick={() => setActiveStep('parents_or_parties')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                activeStep === 'parents_or_parties'
                  ? 'bg-slate-800 text-blue-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {category === 'births'
                ? '3. Parents & Marriage'
                : category === 'marriages'
                ? '3. Husband & Parents'
                : '3. Vital Circumstances'}
            </button>
          )}
          {category === 'marriages' && (
            <button
              type="button"
              onClick={() => setActiveStep('solemnizing_or_cause')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                activeStep === 'solemnizing_or_cause'
                  ? 'bg-slate-800 text-blue-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              4. Solemnizing & Witnesses
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveStep('attachment')}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeStep === 'attachment'
                ? 'bg-slate-800 text-blue-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Document PDF Link {attachment ? '(1 Attached)' : ''}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Book & Registry Index Info */}
          {activeStep === 'book' && (
            <div className="space-y-4">
              <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3 text-xs text-blue-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  Physical Book Registry Coordinates. Registry Number is mandatory. Book Number and Page Number can be bypassed or saved without entry.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Book Number <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={bookNumber}
                    onChange={(e) => setBookNumber(toUpper(e.target.value))}
                    placeholder="E.G. 54 (OPTIONAL)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Page Number <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={pageNumber}
                    onChange={(e) => setPageNumber(toUpper(e.target.value))}
                    placeholder="E.G. 112 (OPTIONAL)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Registry Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={registryNumber}
                    onChange={(e) => setRegistryNumber(toUpper(e.target.value))}
                    placeholder="E.G. 2026-0045"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">
                      Registry Date / Date of Registration
                    </label>
                    {registryDate && (
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        {formatDateDDMMMYYYY(registryDate)}
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={registryDate}
                    onChange={(e) => setRegistryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    System Audit Metadata
                  </label>
                  <div className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-400 font-mono">
                    Added by: <strong className="text-slate-200">@{initialRecord ? initialRecord.usernameAdded : currentUser.username}</strong> |{' '}
                    v{initialRecord ? initialRecord.versions.length + 1 : 1}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Remarks / Legal Annotations (CAPITALIZED)
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(toUpper(e.target.value))}
                  placeholder="LEGITIMATE CHILD, TIMELY REGISTRATION, COURT ORDER ANNOTATION, ETC."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Primary Subject Details according to category */}
          {activeStep === 'details' && (
            <div className="space-y-4">
              {category === 'births' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Child's Full Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={childName}
                        onChange={(e) => setChildName(toUpper(e.target.value))}
                        placeholder="FIRSTNAME MIDDLENAME LASTNAME"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-semibold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Sex</label>
                      <select
                        value={childSex}
                        onChange={(e) => setChildSex(e.target.value as 'MALE' | 'FEMALE')}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="MALE">MALE</option>
                        <option value="FEMALE">FEMALE</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-300">Date of Birth</label>
                        {dateOfBirth && (
                          <span className="text-[11px] font-mono text-emerald-400 font-bold">
                            {formatDateDDMMMYYYY(dateOfBirth)}
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Type of Birth</label>
                      <select
                        value={typeOfBirth}
                        onChange={(e) => setTypeOfBirth(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="SINGLE">SINGLE</option>
                        <option value="TWIN">TWIN</option>
                        <option value="TRIPLET">TRIPLET</option>
                        <option value="MULTIPLE">MULTIPLE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Birth Order</label>
                      <input
                        type="text"
                        value={birthOrder}
                        onChange={(e) => setBirthOrder(toUpper(e.target.value))}
                        placeholder="FIRST, SECOND, ETC."
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Place of Birth</label>
                    <input
                      type="text"
                      value={placeOfBirth}
                      onChange={(e) => setPlaceOfBirth(toUpper(e.target.value))}
                      placeholder="HOSPITAL / CLINIC / HOUSE, BARANGAY, MUNICIPALITY, PROVINCE"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/40 space-y-2">
                    <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Baby className="w-3.5 h-3.5 text-teal-400" />
                      Attendant at Birth (Midwife, Nurse, Doctor, Hilot)
                    </h4>
                    <PersonnelAutocompleteField
                      label="Attendant Name"
                      nameValue={attendantName}
                      onNameChange={setAttendantName}
                      designationValue={attendantTitle}
                      onDesignationChange={setAttendantTitle}
                      primaryRoles={['midwife', 'nurse', 'doctor']}
                      allPersonnel={personnelList}
                      placeholderName="E.G. MELBA C. VALENZUELA, RM OR DR. MA. SOCORRO MONTEJO"
                      placeholderTitle="E.G. REGISTERED MIDWIFE / STAFF NURSE"
                      commonDesignations={BIRTH_ATTENDANT_DESIGNATIONS}
                      helperHint="Select a remembered midwife, nurse, or doctor to auto-populate designation, or enter custom details."
                    />
                  </div>
                </>
              )}

              {category === 'marriages' && (
                <>
                  <div className="border-b border-slate-800 pb-3">
                    <h4 className="text-xs font-bold text-pink-300 uppercase tracking-wider mb-2">
                      Wife / Bride Particulars
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Wife's Full Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={wifeName}
                          onChange={(e) => setWifeName(toUpper(e.target.value))}
                          placeholder="MAIDEN NAME (FIRST, MIDDLE, LAST)"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white uppercase focus:ring-2 focus:ring-pink-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">Wife Age</label>
                        <input
                          type="number"
                          value={wifeAge}
                          onChange={(e) => setWifeAge(e.target.value)}
                          placeholder="25"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">Wife Civil Status</label>
                        <input
                          type="text"
                          value={wifeCivilStatus}
                          onChange={(e) => setWifeCivilStatus(toUpper(e.target.value))}
                          placeholder="SINGLE / WIDOWED / DIVORCED"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white uppercase focus:ring-2 focus:ring-pink-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">Wife Nationality</label>
                        <input
                          type="text"
                          value={wifeNationality}
                          onChange={(e) => setWifeNationality(toUpper(e.target.value))}
                          placeholder="FILIPINO"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white uppercase focus:ring-2 focus:ring-pink-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Wife Residence</label>
                      <input
                        type="text"
                        value={wifeResidence}
                        onChange={(e) => setWifeResidence(toUpper(e.target.value))}
                        placeholder="BARANGAY, MUNICIPALITY, PROVINCE"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white uppercase focus:ring-2 focus:ring-pink-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider mb-2">
                      Husband / Groom Particulars
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Husband's Full Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={husbandName}
                          onChange={(e) => setHusbandName(toUpper(e.target.value))}
                          placeholder="FIRST, MIDDLE, LAST"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">Husband Age</label>
                        <input
                          type="number"
                          value={husbandAge}
                          onChange={(e) => setHusbandAge(e.target.value)}
                          placeholder="28"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">Husband Civil Status</label>
                        <input
                          type="text"
                          value={husbandCivilStatus}
                          onChange={(e) => setHusbandCivilStatus(toUpper(e.target.value))}
                          placeholder="SINGLE"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">Husband Nationality</label>
                        <input
                          type="text"
                          value={husbandNationality}
                          onChange={(e) => setHusbandNationality(toUpper(e.target.value))}
                          placeholder="FILIPINO"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Husband Residence</label>
                      <input
                        type="text"
                        value={husbandResidence}
                        onChange={(e) => setHusbandResidence(toUpper(e.target.value))}
                        placeholder="BARANGAY, MUNICIPALITY, PROVINCE"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {category === 'deaths' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Name of Deceased <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={deceasedName}
                        onChange={(e) => setDeceasedName(toUpper(e.target.value))}
                        placeholder="FIRSTNAME MIDDLENAME LASTNAME"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-semibold uppercase focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Sex</label>
                      <select
                        value={deceasedSex}
                        onChange={(e) => setDeceasedSex(e.target.value as 'MALE' | 'FEMALE')}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="MALE">MALE</option>
                        <option value="FEMALE">FEMALE</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Age at Time of Death (Exact LCR Breakdown)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Years</span>
                        <input
                          type="number"
                          value={ageYears}
                          onChange={(e) => setAgeYears(e.target.value)}
                          placeholder="Years"
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Months</span>
                        <input
                          type="number"
                          value={ageMonths}
                          onChange={(e) => setAgeMonths(e.target.value)}
                          placeholder="Months"
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Days</span>
                        <input
                          type="number"
                          value={ageDays}
                          onChange={(e) => setAgeDays(e.target.value)}
                          placeholder="Days"
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Hours</span>
                        <input
                          type="number"
                          value={ageHours}
                          onChange={(e) => setAgeHours(e.target.value)}
                          placeholder="Hours"
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Fetal Death?</label>
                      <select
                        value={fetalDeath}
                        onChange={(e) => setFetalDeath(e.target.value as 'YES' | 'NO')}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white"
                      >
                        <option value="NO">NO</option>
                        <option value="YES">YES</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Civil Status</label>
                      <input
                        type="text"
                        value={deathCivilStatus}
                        onChange={(e) => setDeathCivilStatus(toUpper(e.target.value))}
                        placeholder="SINGLE / MARRIED / WIDOWED"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Nationality</label>
                      <input
                        type="text"
                        value={deathNationality}
                        onChange={(e) => setDeathNationality(toUpper(e.target.value))}
                        placeholder="FILIPINO"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Usual Occupation</label>
                      <input
                        type="text"
                        value={usualOccupation}
                        onChange={(e) => setUsualOccupation(toUpper(e.target.value))}
                        placeholder="E.G. FARMER, TEACHER, RETIRED"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Usual Residence</label>
                      <input
                        type="text"
                        value={usualResidence}
                        onChange={(e) => setUsualResidence(toUpper(e.target.value))}
                        placeholder="BARANGAY, MUNICIPALITY, PROVINCE"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white uppercase"
                      />
                    </div>
                  </div>
                </>
              )}

              {category === 'legal-instruments' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Type of Legal Instrument <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={legalType}
                      onChange={(e) => setLegalType(toUpper(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-medium"
                    >
                      <option value="AFFIDAVIT OF ACKNOWLEDGMENT">AFFIDAVIT OF ACKNOWLEDGMENT</option>
                      <option value="AFFIDAVIT OF LEGITIMATION BY SUBSEQUENT MARRIAGE">
                        AFFIDAVIT OF LEGITIMATION BY SUBSEQUENT MARRIAGE
                      </option>
                      <option value="COURT DECREE / ORDER OF ADOPTION">COURT DECREE / ORDER OF ADOPTION</option>
                      <option value="COURT DECREE OF ANNULMENT / NULLITY">COURT DECREE OF ANNULMENT / NULLITY</option>
                      <option value="REPUBLIC ACT 9048 (CHANGE OF FIRST NAME / CLERICAL ERROR)">
                        REPUBLIC ACT 9048 (CHANGE OF FIRST NAME / CLERICAL ERROR)
                      </option>
                      <option value="REPUBLIC ACT 10172 (CORRECTION OF SEX / DAY / MONTH OF BIRTH)">
                        REPUBLIC ACT 10172 (CORRECTION OF SEX / DAY / MONTH OF BIRTH)
                      </option>
                      <option value="AFFIDAVIT TO USE THE SURNAME OF THE FATHER (AUSF)">
                        AFFIDAVIT TO USE THE SURNAME OF THE FATHER (AUSF)
                      </option>
                      <option value="SUPPLEMENTAL REPORT FOR CIVIL REGISTRY">
                        SUPPLEMENTAL REPORT FOR CIVIL REGISTRY
                      </option>
                      <option value="FOREIGN COURT JUDGMENT / DIVORCE RECOGNITION">
                        FOREIGN COURT JUDGMENT / DIVORCE RECOGNITION
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Subject Person / Party Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={legalSubjectName}
                      onChange={(e) => setLegalSubjectName(toUpper(e.target.value))}
                      placeholder="NAME OF PERSON OR PARTIES AFFECTED (FIRST, MIDDLE, LAST)"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white uppercase font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Official Receipt & Payment Details (To be included in Revenue) */}
                  <div className="mt-3 p-4 rounded-xl bg-slate-950/90 border border-emerald-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                            Official Receipt (O.R.) & Payment Details
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Included in Municipal Civil Registry Revenue & Collections
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600/50 text-emerald-300 font-mono font-bold">
                        ₱ Revenue Tracking
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-300">
                            Official Receipt (O.R.) Number
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const randomOr = `OR-${Math.floor(892000 + Math.random() * 8000)}`;
                              setLegalOrNumber(randomOr);
                            }}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                          >
                            Auto-Generate O.R.
                          </button>
                        </div>
                        <input
                          type="text"
                          value={legalOrNumber}
                          onChange={(e) => setLegalOrNumber(toUpper(e.target.value))}
                          placeholder="E.G. OR-892315"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Amount Paid (₱ Revenue)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={legalAmountPaid}
                            onChange={(e) => setLegalAmountPaid(e.target.value)}
                            placeholder="200.00"
                            className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-800">
                      <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        Recording this payment will automatically add <strong>₱{legalAmountPaid || '0.00'}</strong> to the current month and yearly revenue totals. Revenue resets on the 1st of each month and Jan 1st yearly.
                      </span>
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: Parents & Secondary Parties */}
          {activeStep === 'parents_or_parties' && (
            <div className="space-y-4">
              {category === 'births' && (
                <>
                  <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/40">
                    <h4 className="text-xs font-bold text-pink-300 uppercase tracking-wider mb-2.5">
                      Mother's Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Mother's Maiden Name
                        </label>
                        <input
                          type="text"
                          value={motherMaidenName}
                          onChange={(e) => setMotherMaidenName(toUpper(e.target.value))}
                          placeholder="FIRST, MIDDLE, LAST (MAIDEN)"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">Age at Birth</label>
                        <input
                          type="number"
                          value={ageAtBirthOfMother}
                          onChange={(e) => setAgeAtBirthOfMother(e.target.value)}
                          placeholder="28"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">Nationality</label>
                        <input
                          type="text"
                          value={nationalityOfMother}
                          onChange={(e) => setNationalityOfMother(toUpper(e.target.value))}
                          placeholder="FILIPINO"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Mother Religion</label>
                      <input
                        type="text"
                        value={religionOfMother}
                        onChange={(e) => setReligionOfMother(toUpper(e.target.value))}
                        placeholder="ROMAN CATHOLIC"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/40">
                    <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider mb-2.5">
                      Father's Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Father's Full Name
                        </label>
                        <input
                          type="text"
                          value={fatherName}
                          onChange={(e) => setFatherName(toUpper(e.target.value))}
                          placeholder="FIRST, MIDDLE, LAST"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">Age at Birth</label>
                        <input
                          type="number"
                          value={ageAtBirthOfFather}
                          onChange={(e) => setAgeAtBirthOfFather(e.target.value)}
                          placeholder="31"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">Nationality</label>
                        <input
                          type="text"
                          value={nationalityOfFather}
                          onChange={(e) => setNationalityOfFather(toUpper(e.target.value))}
                          placeholder="FILIPINO"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Father Religion</label>
                      <input
                        type="text"
                        value={religionOfFather}
                        onChange={(e) => setReligionOfFather(toUpper(e.target.value))}
                        placeholder="ROMAN CATHOLIC"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-slate-800 rounded-xl p-3.5 bg-slate-950/40">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-medium text-slate-300">
                          Parents Date of Marriage
                        </label>
                        {parentsDateOfMarriage && (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">
                            {formatDateDDMMMYYYY(parentsDateOfMarriage)}
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        value={parentsDateOfMarriage}
                        onChange={(e) => setParentsDateOfMarriage(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Parents Place of Marriage
                      </label>
                      <input
                        type="text"
                        value={parentsPlaceOfMarriage}
                        onChange={(e) => setParentsPlaceOfMarriage(toUpper(e.target.value))}
                        placeholder="CHURCH / COURT, MUNICIPALITY, PROVINCE"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                      />
                    </div>
                  </div>
                </>
              )}

              {category === 'marriages' && (
                <>
                  <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/40 space-y-2.5">
                    <h4 className="text-xs font-bold text-pink-300 uppercase tracking-wider">
                      Wife's Parents & Consent
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-0.5">Wife Father Name</label>
                        <input
                          type="text"
                          value={wifeFatherName}
                          onChange={(e) => setWifeFatherName(toUpper(e.target.value))}
                          placeholder="FATHER FULL NAME"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-0.5">Wife Father Nationality</label>
                        <input
                          type="text"
                          value={wifeFatherNationality}
                          onChange={(e) => setWifeFatherNationality(toUpper(e.target.value))}
                          placeholder="FILIPINO"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-0.5">Wife Mother Maiden Name</label>
                        <input
                          type="text"
                          value={wifeMotherName}
                          onChange={(e) => setWifeMotherName(toUpper(e.target.value))}
                          placeholder="MOTHER MAIDEN NAME"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-0.5">Wife Mother Nationality</label>
                        <input
                          type="text"
                          value={wifeMotherNationality}
                          onChange={(e) => setWifeMotherNationality(toUpper(e.target.value))}
                          placeholder="FILIPINO"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-800">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Consent Person Name</label>
                        <input
                          type="text"
                          value={wifeConsentName}
                          onChange={(e) => setWifeConsentName(toUpper(e.target.value))}
                          placeholder="N/A OR NAME"
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Consent Address</label>
                        <input
                          type="text"
                          value={wifeConsentAddress}
                          onChange={(e) => setWifeConsentAddress(toUpper(e.target.value))}
                          placeholder="ADDRESS"
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Relation</label>
                        <input
                          type="text"
                          value={wifeConsentRelation}
                          onChange={(e) => setWifeConsentRelation(toUpper(e.target.value))}
                          placeholder="PARENT / GUARDIAN"
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/40 space-y-2.5">
                    <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider">
                      Husband's Parents & Consent
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-0.5">Husband Father Name</label>
                        <input
                          type="text"
                          value={husbandFatherName}
                          onChange={(e) => setHusbandFatherName(toUpper(e.target.value))}
                          placeholder="FATHER FULL NAME"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-0.5">Husband Father Nationality</label>
                        <input
                          type="text"
                          value={husbandFatherNationality}
                          onChange={(e) => setHusbandFatherNationality(toUpper(e.target.value))}
                          placeholder="FILIPINO"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-0.5">Husband Mother Maiden Name</label>
                        <input
                          type="text"
                          value={husbandMotherName}
                          onChange={(e) => setHusbandMotherName(toUpper(e.target.value))}
                          placeholder="MOTHER MAIDEN NAME"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-0.5">Husband Mother Nationality</label>
                        <input
                          type="text"
                          value={husbandMotherNationality}
                          onChange={(e) => setHusbandMotherNationality(toUpper(e.target.value))}
                          placeholder="FILIPINO"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-800">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Consent Person Name</label>
                        <input
                          type="text"
                          value={husbandConsentName}
                          onChange={(e) => setHusbandConsentName(toUpper(e.target.value))}
                          placeholder="N/A OR NAME"
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Consent Address</label>
                        <input
                          type="text"
                          value={husbandConsentAddress}
                          onChange={(e) => setHusbandConsentAddress(toUpper(e.target.value))}
                          placeholder="ADDRESS"
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Relation</label>
                        <input
                          type="text"
                          value={husbandConsentRelation}
                          onChange={(e) => setHusbandConsentRelation(toUpper(e.target.value))}
                          placeholder="PARENT / GUARDIAN"
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {category === 'deaths' && (
                <>
                  <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/40 space-y-3">
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Date, Time and Place of Death
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Day</span>
                        <input
                          type="text"
                          value={deathDay}
                          onChange={(e) => setDeathDay(e.target.value)}
                          placeholder="01-31"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Month</span>
                        <input
                          type="text"
                          value={deathMonth}
                          onChange={(e) => setDeathMonth(e.target.value)}
                          placeholder="01-12"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Year</span>
                        <input
                          type="text"
                          value={deathYear}
                          onChange={(e) => setDeathYear(e.target.value)}
                          placeholder="2026"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Time of Death</span>
                        <input
                          type="text"
                          value={deathTime}
                          onChange={(e) => setDeathTime(toUpper(e.target.value))}
                          placeholder="E.G. 04:30 AM"
                          className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Place of Death</label>
                      <input
                        type="text"
                        value={placeOfDeath}
                        onChange={(e) => setPlaceOfDeath(toUpper(e.target.value))}
                        placeholder="HOSPITAL / RESIDENCE, BARANGAY, MUNICIPALITY, PROVINCE"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/40 space-y-3">
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Causes of Death & Certifying Officer
                    </h4>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Immediate Cause of Death
                      </label>
                      <input
                        type="text"
                        value={causeImmediate}
                        onChange={(e) => setCauseImmediate(toUpper(e.target.value))}
                        placeholder="E.G. ACUTE RESPIRATORY FAILURE, CARDIOPULMONARY ARREST"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Underlying Cause of Death
                      </label>
                      <input
                        type="text"
                        value={causeUnderlying}
                        onChange={(e) => setCauseUnderlying(toUpper(e.target.value))}
                        placeholder="E.G. HYPERTENSIVE ATHEROSCLEROTIC CARDIOVASCULAR DISEASE"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase font-mono"
                      />
                    </div>
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                          Medical Certificate of Death & Attending Physician
                        </span>
                      </div>
                      <PersonnelAutocompleteField
                        label="Certifying Medical Officer"
                        nameValue={certifyingOfficerName}
                        onNameChange={setCertifyingOfficerName}
                        designationValue={certifyingOfficerTitle}
                        onDesignationChange={setCertifyingOfficerTitle}
                        primaryRoles={['doctor']}
                        allPersonnel={personnelList}
                        placeholderName="DR. MA. SOCORRO MONTEJO, M.D."
                        placeholderTitle="MUNICIPAL HEALTH OFFICER"
                        commonDesignations={DEATH_CERTIFIER_DESIGNATIONS}
                        helperHint="Select a remembered doctor/physician or enter a new name. Designations can be adjusted or picked from quick options."
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 4: Solemnizing & Witnesses for Marriage */}
          {activeStep === 'solemnizing_or_cause' && category === 'marriages' && (
            <div className="space-y-4">
              <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/40 space-y-3">
                <h4 className="text-xs font-bold text-pink-300 uppercase tracking-wider">
                  Ceremony & Solemnization Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] text-slate-300">Date of Marriage</label>
                      {marriageDate && (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {formatDateDDMMMYYYY(marriageDate)}
                        </span>
                      )}
                    </div>
                    <input
                      type="date"
                      value={marriageDate}
                      onChange={(e) => setMarriageDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-0.5">Time of Marriage</label>
                    <input
                      type="text"
                      value={marriageTime}
                      onChange={(e) => setMarriageTime(toUpper(e.target.value))}
                      placeholder="10:00 AM"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] text-slate-300">Date of Receipt</label>
                      {dateOfReceipt && (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {formatDateDDMMMYYYY(dateOfReceipt)}
                        </span>
                      )}
                    </div>
                    <input
                      type="date"
                      value={dateOfReceipt}
                      onChange={(e) => setDateOfReceipt(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-0.5">Place of Marriage</label>
                  <input
                    type="text"
                    value={marriagePlace}
                    onChange={(e) => setMarriagePlace(toUpper(e.target.value))}
                    placeholder="CHURCH / MTC HALL OF JUSTICE / MAYOR'S OFFICE"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                  <PersonnelAutocompleteField
                    label="Solemnizing Officer & Authority"
                    nameValue={solemnizingOfficer}
                    onNameChange={setSolemnizingOfficer}
                    designationValue={solemnizingTitle}
                    onDesignationChange={setSolemnizingTitle}
                    primaryRoles={['solemnizing_officer', 'mcr']}
                    allPersonnel={personnelList}
                    placeholderName="HON. JUDGE ALFONSO SERAFIN OR REV. FR. DOMINGO"
                    placeholderTitle="ACTING PRESIDING JUDGE, MTC"
                    commonDesignations={SOLEMNIZING_OFFICER_DESIGNATIONS}
                    onSelectPerson={(person) => {
                      if (person.addressOrAffiliation && !solemnizingAddress) {
                        setSolemnizingAddress(person.addressOrAffiliation);
                      }
                    }}
                    helperHint="Select a remembered judge, priest, pastor, or minister. Designations and stations are automatically auto-suggested."
                  />
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-0.5 font-medium">Solemnizing Officer Station / Address</label>
                    <input
                      type="text"
                      value={solemnizingAddress}
                      onChange={(e) => setSolemnizingAddress(toUpper(e.target.value))}
                      placeholder="HALL OF JUSTICE, CULABA, BILIRAN / PARISH RECTORY"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/40 space-y-3">
                <h4 className="text-xs font-bold text-pink-300 uppercase tracking-wider">
                  Witnesses (Of Legal Age)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-0.5">Witness 1 Full Name</label>
                    <input
                      type="text"
                      value={witness1Name}
                      onChange={(e) => setWitness1Name(toUpper(e.target.value))}
                      placeholder="WITNESS 1 NAME"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-0.5">Witness 1 Residence</label>
                    <input
                      type="text"
                      value={witness1Residence}
                      onChange={(e) => setWitness1Residence(toUpper(e.target.value))}
                      placeholder="RESIDENCE"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-0.5">Witness 2 Full Name</label>
                    <input
                      type="text"
                      value={witness2Name}
                      onChange={(e) => setWitness2Name(toUpper(e.target.value))}
                      placeholder="WITNESS 2 NAME"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-0.5">Witness 2 Residence</label>
                    <input
                      type="text"
                      value={witness2Residence}
                      onChange={(e) => setWitness2Residence(toUpper(e.target.value))}
                      placeholder="RESIDENCE"
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: PDF Attachment linking */}
          {activeStep === 'attachment' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="application/pdf,.pdf"
                  className="hidden"
                />

                {!attachment ? (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Upload Scanned Civil Registry Book Page (PDF)
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        Link the official scanned PDF copy directly to this index entry. This PDF will be permanently
                        attached and viewable in the system reader.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
                    >
                      Browse PDF File...
                    </button>
                    <span className="block text-[10px] text-slate-500">Supports standard PDF scans up to 20MB</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono">
                        <FileText className="w-4 h-4 text-red-400" />
                        <span className="font-semibold">{attachment.name}</span>
                        <span className="text-slate-400">({(attachment.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <p className="text-xs text-emerald-300 mt-2 font-medium">
                        ✓ PDF document attached and linked to this index.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      {onPreviewPdf && (
                        <button
                          type="button"
                          onClick={() => onPreviewPdf(attachment)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium border border-slate-700 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview Document</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Replace PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttachment(undefined)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 rounded-lg text-xs font-medium border border-red-800/80 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {activeStep !== 'book' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeStep === 'attachment') {
                      setActiveStep(category === 'marriages' ? 'solemnizing_or_cause' : category !== 'legal-instruments' ? 'parents_or_parties' : 'details');
                    } else if (activeStep === 'solemnizing_or_cause') {
                      setActiveStep('parents_or_parties');
                    } else if (activeStep === 'parents_or_parties') {
                      setActiveStep('details');
                    } else {
                      setActiveStep('book');
                    }
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition cursor-pointer"
                >
                  ← Back
                </button>
              )}
              {activeStep !== 'attachment' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeStep === 'book') setActiveStep('details');
                    else if (activeStep === 'details') {
                      setActiveStep(category !== 'legal-instruments' ? 'parents_or_parties' : 'attachment');
                    } else if (activeStep === 'parents_or_parties') {
                      setActiveStep(category === 'marriages' ? 'solemnizing_or_cause' : 'attachment');
                    } else {
                      setActiveStep('attachment');
                    }
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-medium rounded-lg transition cursor-pointer"
                >
                  Next Step →
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-record-submit-btn"
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-900/40 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{initialRecord ? 'Save Record Changes' : 'Save Index to Book'}</span>
              </button>
            </div>
          </div>
        </form>
        </>
        )}

        {/* Personnel Memory Directory Sub-Modal */}
        {showDirectoryModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Personnel Memory Directory
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                        {personnelList.length} Remembered
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Auto-learns doctors, nurses, midwives, MCR officers, and solemnizing officers for quick auto-complete.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDirectoryModal(false);
                    setShowAddPersonnelForm(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Toolbar: Search, Filters & Add New Button */}
              <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    placeholder="Search personnel by name or designation..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddPersonnelForm(!showAddPersonnelForm)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddPersonnelForm ? 'Cancel Entry' : 'Add Personnel'}</span>
                  </button>
                </div>
              </div>

              {/* Role filter pills */}
              <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <button
                  type="button"
                  onClick={() => setDirectoryFilter('all')}
                  className={`px-2.5 py-0.5 rounded-full transition cursor-pointer ${
                    directoryFilter === 'all'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All Roles
                </button>
                {(['doctor', 'midwife', 'nurse', 'solemnizing_officer', 'mcr', 'other'] as PersonnelRole[]).map((r) => {
                  const badge = getRoleBadge(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDirectoryFilter(r)}
                      className={`px-2.5 py-0.5 rounded-full transition cursor-pointer capitalize ${
                        directoryFilter === r
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      {badge.label}
                    </button>
                  );
                })}
              </div>

              {/* Optional Add New Personnel Form */}
              {showAddPersonnelForm && (
                <div className="p-3 bg-slate-900/90 border-b border-slate-700/80 space-y-2.5 animate-in slide-in-from-top-2">
                  <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wide flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Personnel to System Memory
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-300 mb-0.5">Full Name & Title</label>
                      <input
                        type="text"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(toUpper(e.target.value))}
                        placeholder="DR. FIRSTNAME LASTNAME, M.D."
                        className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-300 mb-0.5">Designation / Position</label>
                      <input
                        type="text"
                        value={newPersonDesignation}
                        onChange={(e) => setNewPersonDesignation(toUpper(e.target.value))}
                        placeholder="MUNICIPAL HEALTH OFFICER / REGISTERED MIDWIFE"
                        className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-300 mb-0.5">Role Category</label>
                      <select
                        value={newPersonRole}
                        onChange={(e) => setNewPersonRole(e.target.value as PersonnelRole)}
                        className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                      >
                        <option value="doctor">Doctor / Physician</option>
                        <option value="midwife">Registered Midwife</option>
                        <option value="nurse">Nurse</option>
                        <option value="solemnizing_officer">Solemnizing Officer / Judge / Priest</option>
                        <option value="mcr">MCR / Civil Registrar</option>
                        <option value="hilot">Traditional Attendant / Hilot</option>
                        <option value="other">Other Official</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-300 mb-0.5">Station / Office / Address (Optional)</label>
                      <input
                        type="text"
                        value={newPersonAffiliation}
                        onChange={(e) => setNewPersonAffiliation(toUpper(e.target.value))}
                        placeholder="CULABA RHU / HALL OF JUSTICE"
                        className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white uppercase"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddPersonnelForm(false)}
                      className="px-2.5 py-1 bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newPersonName.trim()) return;
                        storageService.rememberPersonnel({
                          name: toUpper(newPersonName.trim()),
                          designation: toUpper(newPersonDesignation.trim()) || 'OFFICIAL',
                          roleType: newPersonRole,
                          addressOrAffiliation: toUpper(newPersonAffiliation.trim()) || undefined,
                        });
                        const updated = storageService.getPersonnelMemory();
                        setPersonnelList(updated);
                        setNewPersonName('');
                        setNewPersonDesignation('');
                        setNewPersonAffiliation('');
                        setShowAddPersonnelForm(false);
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      Save to Memory
                    </button>
                  </div>
                </div>
              )}

              {/* Personnel List Table */}
              <div className="overflow-y-auto flex-1 p-2 divide-y divide-slate-800/60">
                {personnelList
                  .filter((p) => {
                    const matchesRole = directoryFilter === 'all' || p.roleType === directoryFilter;
                    const matchesSearch =
                      !directorySearch.trim() ||
                      p.name.toLowerCase().includes(directorySearch.toLowerCase()) ||
                      p.designation.toLowerCase().includes(directorySearch.toLowerCase()) ||
                      (p.addressOrAffiliation && p.addressOrAffiliation.toLowerCase().includes(directorySearch.toLowerCase()));
                    return matchesRole && matchesSearch;
                  })
                  .map((person) => {
                    const badge = getRoleBadge(person.roleType);
                    return (
                      <div
                        key={person.id}
                        className="py-2.5 px-3 hover:bg-slate-800/40 rounded-lg flex items-center justify-between gap-3 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-xs font-bold text-white uppercase">{person.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${badge.color}`}>
                              {badge.label}
                            </span>
                            {person.usageCount ? (
                              <span className="text-[9px] text-slate-500 bg-slate-950/80 px-1.5 py-0.2 rounded font-mono">
                                Used {person.usageCount}×
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-emerald-300 font-mono">
                            {person.designation}
                            {person.addressOrAffiliation && (
                              <span className="text-slate-400 font-sans ml-2">
                                • {person.addressOrAffiliation}
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              // Apply to current open record category
                              if (category === 'births') {
                                setAttendantName(person.name);
                                setAttendantTitle(person.designation);
                              } else if (category === 'marriages') {
                                setSolemnizingOfficer(person.name);
                                setSolemnizingTitle(person.designation);
                                if (person.addressOrAffiliation) {
                                  setSolemnizingAddress(person.addressOrAffiliation);
                                }
                              } else if (category === 'deaths') {
                                setCertifyingOfficerName(person.name);
                                setCertifyingOfficerTitle(person.designation);
                              }
                              setShowDirectoryModal(false);
                            }}
                            className="px-2.5 py-1 bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-medium rounded transition cursor-pointer"
                          >
                            Apply to Form
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              storageService.deletePersonnelMemoryItem(person.id);
                              setPersonnelList(storageService.getPersonnelMemory());
                            }}
                            className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                            title="Remove from memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

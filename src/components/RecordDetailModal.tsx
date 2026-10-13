import React from 'react';
import { AnyRegistryRecord, UserAccount, DocumentAttachment } from '../types';
import {
  X,
  FileText,
  Clock,
  User,
  History,
  Award,
  Edit,
  Trash2,
  Paperclip,
  Eye,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { formatDateDDMMMYYYY } from '../utils/dateUtils';

interface RecordDetailModalProps {
  record: AnyRegistryRecord | null;
  currentUser: UserAccount;
  canDelete: boolean;
  onClose: () => void;
  onEdit: (record: AnyRegistryRecord) => void;
  onDelete: (record: AnyRegistryRecord) => void;
  onIssueCert: (record: AnyRegistryRecord) => void;
  onPreviewPdf: (attachment: DocumentAttachment) => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  currentUser,
  canDelete,
  onClose,
  onEdit,
  onDelete,
  onIssueCert,
  onPreviewPdf,
}) => {
  if (!record) return null;

  const getRecordTitle = () => {
    if (record.category === 'births') return (record as any).name;
    if (record.category === 'marriages') return `${(record as any).husbandName} & ${(record as any).wifeName}`;
    if (record.category === 'deaths') return (record as any).nameOfDeceased;
    return (record as any).name;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-mono text-xs font-bold">
              {record.bookNumber ? `B${record.bookNumber}` : 'REG'}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{getRecordTitle()}</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-mono uppercase">
                  {record.category}
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {record.bookNumber ? `Book ${record.bookNumber} • ` : ''}
                {record.pageNumber ? `Page ${record.pageNumber} • ` : ''}
                Registry No. {record.registryNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Registry Coordinate Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 font-mono text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Book No.</span>
              <span className="font-bold text-slate-900 text-sm">{record.bookNumber || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Page No.</span>
              <span className="font-bold text-slate-900 text-sm">{record.pageNumber || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Registry No.</span>
              <span className="font-bold text-blue-700 text-sm">{record.registryNumber}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Registration Date</span>
              <span className="font-semibold text-slate-700">{formatDateDDMMMYYYY(record.registryDate || (record as any).dateOfRegistration)}</span>
            </div>
          </div>

          {/* Attached Document Section */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-blue-600" />
              <span>Linked Civil Registry PDF Document</span>
            </h4>
            {record.pdfAttachment ? (
              <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{record.pdfAttachment.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {(record.pdfAttachment.size / 1024).toFixed(1)} KB • Uploaded by @
                      {record.pdfAttachment.uploadedBy} on {formatDateDDMMMYYYY(record.pdfAttachment.uploadedAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onPreviewPdf(record.pdfAttachment!)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View PDF</span>
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-2">
                No PDF document currently attached to this index record. Click "Edit Record" to upload.
              </div>
            )}
          </div>

          {/* Category-Specific Data Grid */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Archived Record Particulars
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {record.category === 'births' && (
                <>
                  <div>
                    <span className="text-slate-500 block">Child's Name:</span>
                    <strong className="text-slate-900 text-sm">{(record as any).name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Sex:</span>
                    <strong className="text-slate-900">{(record as any).sex}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date of Birth:</span>
                    <strong className="text-slate-900">{formatDateDDMMMYYYY((record as any).dateOfBirth)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Place of Birth:</span>
                    <strong className="text-slate-900">{(record as any).placeOfBirth}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Type & Order of Birth:</span>
                    <strong className="text-slate-900">
                      {(record as any).typeOfBirth} ({(record as any).birthOrder})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Mother Maiden Name:</span>
                    <strong className="text-slate-900">{(record as any).motherMaidenName}</strong> (Age:{' '}
                    {(record as any).ageAtBirthOfMother})
                  </div>
                  <div>
                    <span className="text-slate-500 block">Father Name:</span>
                    <strong className="text-slate-900">{(record as any).fatherName}</strong> (Age:{' '}
                    {(record as any).ageAtBirthOfFather})
                  </div>
                  <div>
                    <span className="text-slate-500 block">Parents Date & Place of Marriage:</span>
                    <strong className="text-slate-900">
                      {formatDateDDMMMYYYY((record as any).dateOfMarriage)} at {(record as any).placeOfMarriage}
                    </strong>
                  </div>
                </>
              )}

              {record.category === 'marriages' && (
                <>
                  <div>
                    <span className="text-slate-500 block">Husband:</span>
                    <strong className="text-slate-900 text-sm">{(record as any).husbandName}</strong> (Age:{' '}
                    {(record as any).husbandAge}, {(record as any).husbandCivilStatus})
                  </div>
                  <div>
                    <span className="text-slate-500 block">Wife:</span>
                    <strong className="text-slate-900 text-sm">{(record as any).wifeName}</strong> (Age:{' '}
                    {(record as any).wifeAge}, {(record as any).wifeCivilStatus})
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date of Marriage:</span>
                    <strong className="text-slate-900">{formatDateDDMMMYYYY((record as any).dateOfMarriage)}</strong>
                    {(record as any).timeOfMarriage && ` at ${(record as any).timeOfMarriage}`}
                  </div>
                  <div>
                    <span className="text-slate-500 block">Place of Marriage:</span>
                    <strong className="text-slate-900">{(record as any).placeOfMarriage}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Solemnizing Officer:</span>
                    <strong className="text-slate-900">
                      {(record as any).solemnizingOfficer} ({(record as any).solemnizingTitle})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Witnesses:</span>
                    <strong className="text-slate-900">
                      1. {(record as any).witness1Name} | 2. {(record as any).witness2Name}
                    </strong>
                  </div>
                </>
              )}

              {record.category === 'deaths' && (
                <>
                  <div>
                    <span className="text-slate-500 block">Deceased Name:</span>
                    <strong className="text-slate-900 text-sm">{(record as any).nameOfDeceased}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Sex & Civil Status:</span>
                    <strong className="text-slate-900">
                      {(record as any).sex}, {(record as any).civilStatus}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Age at Death:</span>
                    <strong className="text-slate-900">
                      {(record as any).ageYears} yrs, {(record as any).ageMonths} mos, {(record as any).ageDays} days
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Date & Time of Death:</span>
                    <strong className="text-slate-900">
                      {formatDateDDMMMYYYY(
                        `${(record as any).dateOfDeathYear}-${(record as any).dateOfDeathMonth}-${(record as any).dateOfDeathDay}`
                      )}
                      {(record as any).timeOfDeath && ` at ${(record as any).timeOfDeath}`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Place of Death:</span>
                    <strong className="text-slate-900">{(record as any).placeOfDeath}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Immediate Cause of Death:</span>
                    <strong className="text-amber-800 font-bold">{(record as any).causeOfDeathImmediate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Underlying Cause:</span>
                    <strong className="text-amber-700">{(record as any).causeOfDeathUnderlying}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Certifying Officer:</span>
                    <strong className="text-slate-900">{(record as any).certifyingOfficerName}</strong>
                  </div>
                </>
              )}

              {record.category === 'legal-instruments' && (
                <>
                  <div>
                    <span className="text-slate-500 block">Type of Legal Instrument:</span>
                    <strong className="text-blue-700 text-sm">{(record as any).typeOfLegalInstrument}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Subject / Party Name:</span>
                    <strong className="text-slate-900 text-sm">{(record as any).name}</strong>
                  </div>
                </>
              )}
            </div>

            {record.remarks && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 text-[11px] block">Remarks / Civil Registry Annotations:</span>
                <p className="text-xs text-slate-800 mt-0.5 bg-white border border-slate-200 p-2 rounded-lg font-mono">
                  {record.remarks}
                </p>
              </div>
            )}
          </div>

          {/* Audit & Version History Timeline */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-purple-600" />
                <span>Audit Trail & Version History ({record.versions?.length || 1} versions)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                First added: {formatDateDDMMMYYYY(record.firstAddedDateTime)} by @{record.usernameAdded}
              </span>
            </h4>

            <div className="space-y-2">
              {record.versions?.map((v, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <span className="text-purple-700 font-bold mr-2">Version {v.version}</span>
                    <span className="text-slate-800">{v.changesSummary}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    by <strong className="text-slate-900">@{v.modifiedBy}</strong> on {formatDateDDMMMYYYY(v.modifiedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-[#F8FAFC] border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {canDelete && (
              <button
                type="button"
                id="modal-delete-record-btn"
                onClick={() => onDelete(record)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Record</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              id="modal-issue-cert-btn"
              onClick={() => onIssueCert(record)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Issue LCR Certification</span>
            </button>

            <button
              type="button"
              id="modal-edit-record-btn"
              onClick={() => onEdit(record)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Record</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

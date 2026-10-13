import React, { useState, useMemo } from 'react';
import {
  RegistryCategory,
  AnyRegistryRecord,
  BirthRecord,
  MarriageRecord,
  DeathRecord,
  LegalInstrumentRecord,
  UserAccount,
  DocumentAttachment,
} from '../types';
import {
  Search,
  Filter,
  PlusCircle,
  FileText,
  Eye,
  Edit,
  Trash2,
  Award,
  Paperclip,
  CheckCircle,
  FileQuestion,
  Baby,
  Heart,
  Cross,
  Scroll,
} from 'lucide-react';
import { formatDateDDMMMYYYY } from '../utils/dateUtils';

interface RecordListProps {
  category: RegistryCategory;
  records: AnyRegistryRecord[];
  currentUser: UserAccount;
  canDelete: boolean;
  onOpenCreate: () => void;
  onViewRecord: (record: AnyRegistryRecord) => void;
  onEditRecord: (record: AnyRegistryRecord) => void;
  onDeleteRecord: (record: AnyRegistryRecord) => void;
  onBulkDeleteRecords?: (category: RegistryCategory, ids: string[]) => void;
  onIssueCert: (record: AnyRegistryRecord) => void;
  onPreviewPdf: (attachment: DocumentAttachment, title: string) => void;
}

export const RecordList: React.FC<RecordListProps> = ({
  category,
  records,
  currentUser,
  canDelete,
  onOpenCreate,
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
  onBulkDeleteRecords,
  onIssueCert,
  onPreviewPdf,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<string>('ALL');
  const [pdfFilter, setPdfFilter] = useState<'ALL' | 'WITH_PDF' | 'WITHOUT_PDF'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Extract unique book numbers
  const uniqueBooks = useMemo(() => {
    const rawBooks = records.map((r) => r.bookNumber).filter((b): b is string => Boolean(b));
    const books: string[] = Array.from(new Set(rawBooks));
    return books.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Book filter
      if (selectedBook === 'NO_BOOK' && r.bookNumber && r.bookNumber.trim() !== '') return false;
      if (selectedBook !== 'ALL' && selectedBook !== 'NO_BOOK' && r.bookNumber !== selectedBook) return false;

      // PDF filter
      if (pdfFilter === 'WITH_PDF' && !r.pdfAttachment) return false;
      if (pdfFilter === 'WITHOUT_PDF' && r.pdfAttachment) return false;

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();

      let subjectName = '';
      if (r.category === 'births') subjectName = (r as BirthRecord).name || '';
      else if (r.category === 'marriages')
        subjectName = `${(r as MarriageRecord).husbandName} ${(r as MarriageRecord).wifeName}`;
      else if (r.category === 'deaths') subjectName = (r as DeathRecord).nameOfDeceased || '';
      else if (r.category === 'legal-instruments') subjectName = (r as LegalInstrumentRecord).name || '';

      return (
        subjectName.toLowerCase().includes(q) ||
        (r.registryNumber && r.registryNumber.toLowerCase().includes(q)) ||
        (r.bookNumber && r.bookNumber.toLowerCase().includes(q)) ||
        (r.pageNumber && r.pageNumber.toLowerCase().includes(q)) ||
        (r.remarks && r.remarks.toLowerCase().includes(q)) ||
        (r.registryDate && r.registryDate.includes(q)) ||
        formatDateDDMMMYYYY(r.registryDate || (r as any).dateOfRegistration).toLowerCase().includes(q)
      );
    });
  }, [records, selectedBook, pdfFilter, searchQuery]);

  const getCategoryIcon = () => {
    if (category === 'births') return <Baby className="w-5 h-5 text-sky-400" />;
    if (category === 'marriages') return <Heart className="w-5 h-5 text-pink-400" />;
    if (category === 'deaths') return <Cross className="w-5 h-5 text-amber-400" />;
    return <Scroll className="w-5 h-5 text-indigo-400" />;
  };

  const getCategoryTitle = () => {
    if (category === 'births') return 'Birth Registry Book Archives';
    if (category === 'marriages') return 'Marriage Registry Book Archives';
    if (category === 'deaths') return 'Death Registry Book Archives';
    return 'Legal Instruments Book Archives';
  };

  const getSubjectDisplay = (record: AnyRegistryRecord) => {
    if (record.category === 'births') {
      const b = record as BirthRecord;
      return (
        <div>
          <span className="font-bold text-slate-900 text-xs sm:text-sm block">{b.name}</span>
          <span className="text-[11px] text-slate-500">
            {b.sex} • Born {formatDateDDMMMYYYY(b.dateOfBirth)} in {b.placeOfBirth}
          </span>
        </div>
      );
    }
    if (record.category === 'marriages') {
      const m = record as MarriageRecord;
      return (
        <div>
          <span className="font-bold text-slate-900 text-xs sm:text-sm block">
            {m.husbandName} & {m.wifeName}
          </span>
          <span className="text-[11px] text-slate-500">
            Married on {formatDateDDMMMYYYY(m.dateOfMarriage)} at {m.placeOfMarriage}
          </span>
        </div>
      );
    }
    if (record.category === 'deaths') {
      const d = record as DeathRecord;
      return (
        <div>
          <span className="font-bold text-slate-900 text-xs sm:text-sm block">{d.nameOfDeceased}</span>
          <span className="text-[11px] text-slate-500">
            {d.sex}, {d.ageYears} yrs • Died{' '}
            {formatDateDDMMMYYYY(`${d.dateOfDeathYear}-${d.dateOfDeathMonth}-${d.dateOfDeathDay}`)} (
            {d.causeOfDeathImmediate || 'Cause Unspecified'})
          </span>
        </div>
      );
    }
    const l = record as LegalInstrumentRecord;
    return (
      <div>
        <span className="font-bold text-slate-900 text-xs sm:text-sm block">{l.name}</span>
        <span className="text-[11px] text-indigo-600 font-medium">{l.typeOfLegalInstrument}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Control Header & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
              {getCategoryIcon()}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">{getCategoryTitle()}</h2>
              <p className="text-xs text-slate-500">
                Total {records.length} indexed records • Showing {filteredRecords.length} results
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ NEW RECORD</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, registry #, book #, page #, date, or remarks..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedBook}
              onChange={(e) => setSelectedBook(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">All Register Books ({uniqueBooks.length})</option>
              <option value="NO_BOOK">Without Book Entry (Unindexed Book)</option>
              {uniqueBooks.map((b) => (
                <option key={b} value={b}>
                  Book Number: {b}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={pdfFilter}
              onChange={(e) => setPdfFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">All Documents</option>
              <option value="WITH_PDF">With Attached Scanned PDF</option>
              <option value="WITHOUT_PDF">Missing PDF Scan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions Banner (Admin & Superadmin) */}
      {selectedIds.length > 0 && canDelete && (
        <div className="mb-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="font-bold text-blue-900">
              {selectedIds.length} {selectedIds.length === 1 ? 'record' : 'records'} selected
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
            onClick={() => {
              if (onBulkDeleteRecords) {
                onBulkDeleteRecords(category, selectedIds);
                setSelectedIds([]);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bulk Delete Selected ({selectedIds.length})</span>
          </button>
        </div>
      )}

      {/* Registry Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileQuestion className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No indexed records match your query</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search terms, select a different book, or create a new civil registry index entry.
            </p>
            <button
              onClick={onOpenCreate}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Index</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  {canDelete && (
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredRecords.length > 0 && filteredRecords.every((r) => selectedIds.includes(r.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const allVisible = filteredRecords.map((r) => r.id);
                            setSelectedIds(Array.from(new Set([...selectedIds, ...allVisible])));
                          } else {
                            const visibleSet = new Set(filteredRecords.map((r) => r.id));
                            setSelectedIds(selectedIds.filter((id) => !visibleSet.has(id)));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="Select All Visible Records"
                      />
                    </th>
                  )}
                  <th className="py-3 px-4">Book / Page / Reg #</th>
                  <th className="py-3 px-4">Subject Name & Details</th>
                  <th className="py-3 px-4 hidden md:table-cell">Registry Date</th>
                  <th className="py-3 px-4">Document PDF</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Audit / Ver</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRecords.map((rec) => {
                  const isRowSelected = selectedIds.includes(rec.id);
                  const subjectTitle =
                    rec.category === 'births'
                      ? (rec as any).name
                      : rec.category === 'marriages'
                      ? `${(rec as any).husbandName} & ${(rec as any).wifeName}`
                      : rec.category === 'deaths'
                      ? (rec as any).nameOfDeceased
                      : (rec as any).name;

                  return (
                    <tr
                      key={rec.id}
                      className={`transition ${isRowSelected ? 'bg-blue-50/50 hover:bg-blue-50/70' : 'hover:bg-slate-50/80'}`}
                    >
                      {canDelete && (
                        <td className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds([...selectedIds, rec.id]);
                              } else {
                                setSelectedIds(selectedIds.filter((id) => id !== rec.id));
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}
                      {/* Coordinates */}
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono">
                            {rec.bookNumber ? `B-${rec.bookNumber}` : 'B: —'}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono">
                            {rec.pageNumber ? `P-${rec.pageNumber}` : 'P: —'}
                          </span>
                        </div>
                        <span className="text-[11px] text-blue-600 font-bold block mt-1">
                          Reg# {rec.registryNumber}
                        </span>
                      </td>

                      {/* Subject Name */}
                      <td className="py-3 px-4">{getSubjectDisplay(rec)}</td>

                      {/* Registry Date */}
                      <td className="py-3 px-4 font-mono text-slate-600 hidden md:table-cell">
                        {formatDateDDMMMYYYY(rec.registryDate || (rec as any).dateOfRegistration)}
                      </td>

                      {/* PDF Attachment */}
                      <td className="py-3 px-4">
                        {rec.pdfAttachment ? (
                          <button
                            type="button"
                            onClick={() => onPreviewPdf(rec.pdfAttachment!, subjectTitle)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-md text-[11px] font-semibold transition cursor-pointer"
                            title={`View ${rec.pdfAttachment.name}`}
                          >
                            <FileText className="w-3.5 h-3.5 text-rose-600" />
                            <span className="hidden sm:inline">View PDF Scan</span>
                            <span className="sm:hidden">PDF</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No PDF Linked</span>
                        )}
                      </td>

                      {/* Version & Audit */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 hidden lg:table-cell">
                        <span className="text-slate-700 font-semibold block">v{rec.versions?.length || 1}</span>
                        <span className="text-[10px] text-slate-400">@{rec.usernameAdded}</span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Issue Certificate Button */}
                          <button
                            type="button"
                            onClick={() => onIssueCert(rec)}
                            title={`Issue ${category === 'births' ? 'LCR Form 1x (Birth)' : category === 'deaths' ? 'LCR Form 2x (Death)' : category === 'marriages' ? 'LCR Form 3x (Marriage)' : 'LCR Form'} Certification`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-md text-xs font-bold transition cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden sm:inline">
                              Issue {category === 'births' ? 'Form 1x' : category === 'deaths' ? 'Form 2x' : category === 'marriages' ? 'Form 3x' : 'Cert'}
                            </span>
                          </button>

                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => onViewRecord(rec)}
                            title="View Full Details"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Record */}
                          <button
                            type="button"
                            onClick={() => onEditRecord(rec)}
                            title="Edit Record"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-blue-600 rounded-md transition cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Record (RBAC checked) */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => onDeleteRecord(rec)}
                              title="Delete Record (Authorized Roles only)"
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-md transition cursor-pointer"
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
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Search,
  CheckCheck,
  Trash2,
  Filter,
  PlusCircle,
  Megaphone,
  ArrowUpDown,
  Calendar,
  X,
  AlertTriangle,
  Award,
  Baby,
  Heart,
  Cross,
  Scroll,
  ShieldCheck,
  Info,
  Check,
  Eye,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import {
  CrisNotification,
  NotificationType,
  NotificationPriority,
  UserAccount,
  UserRole,
} from '../types';
import { storageService } from '../services/storage';
import { formatDateTimeDDMMMYYYY, formatDateDDMMMYYYY } from '../utils/dateUtils';

interface NotificationCenterViewProps {
  currentUser: UserAccount;
  onNavigateToRecord?: (category: string, recordId?: string) => void;
  onBackToDashboard?: () => void;
}

export const NotificationCenterView: React.FC<NotificationCenterViewProps> = ({
  currentUser,
  onNavigateToRecord,
  onBackToDashboard,
}) => {
  const [notifications, setNotifications] = useState<CrisNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Multi-select & Bulk delete state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CrisNotification | null>(null);
  const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false);

  // Announcement Modal State
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState<NotificationPriority>('high');
  const [targetRoles, setTargetRoles] = useState<UserRole[]>([
    'superadmin',
    'mcr',
    'admin',
    'clerk',
    'user',
  ]);
  const [announcementError, setAnnouncementError] = useState('');

  const canPublishAnnouncement = ['superadmin', 'mcr', 'admin'].includes(currentUser.role);

  const loadData = () => {
    const unread = storageService.getUnreadCount(currentUser);
    setUnreadCount(unread);
    const list = storageService.getNotifications(currentUser, {
      readStatus: readFilter,
      type: typeFilter,
      search: searchQuery,
    });
    setNotifications(list);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = storageService.subscribeToNotifications(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [currentUser, readFilter, typeFilter, searchQuery]);

  // Sort
  const sortedNotifications = useMemo(() => {
    const copy = [...notifications];
    if (sortOrder === 'oldest') {
      copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return copy;
  }, [notifications, sortOrder]);

  // Single Mark as Read
  const handleMarkAsRead = (id: string) => {
    storageService.markNotificationAsRead(id, currentUser);
    loadData();
  };

  // Mark All Visible as Read
  const handleMarkAllAsRead = () => {
    storageService.markAllNotificationsAsRead(currentUser);
    loadData();
  };

  // Mark Selected as Read
  const handleMarkSelectedAsRead = () => {
    selectedIds.forEach((id) => {
      storageService.markNotificationAsRead(id, currentUser);
    });
    setSelectedIds([]);
    loadData();
  };

  // Trigger Single Delete
  const handleRequestSingleDelete = (notif: CrisNotification) => {
    setItemToDelete(notif);
    setIsBulkDeleteConfirm(false);
    setIsDeleteDialogOpen(true);
  };

  // Trigger Bulk Delete
  const handleRequestBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleteConfirm(true);
    setItemToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    try {
      if (isBulkDeleteConfirm) {
        storageService.bulkDeleteNotifications(selectedIds, currentUser);
        setSelectedIds([]);
      } else if (itemToDelete) {
        storageService.deleteNotification(itemToDelete.id, currentUser);
        setItemToDelete(null);
      }
      setIsDeleteDialogOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.message || 'Failed to delete notification.');
    }
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all visible
  const handleToggleSelectAll = () => {
    if (selectedIds.length === sortedNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedNotifications.map((n) => n.id));
    }
  };

  // Submit Announcement
  const handlePublishAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      setAnnouncementError('Title and announcement content are required.');
      return;
    }

    try {
      storageService.createAnnouncement(
        {
          title: announcementTitle.trim(),
          message: announcementMessage.trim(),
          priority: announcementPriority,
          targetRoles: targetRoles.length > 0 ? targetRoles : undefined,
        },
        currentUser
      );

      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setAnnouncementError('');
      setIsAnnouncementModalOpen(false);
      loadData();
    } catch (err: any) {
      setAnnouncementError(err.message || 'Failed to publish announcement.');
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'RECORD_CREATED':
        return <Baby className="w-4 h-4 text-blue-600" />;
      case 'RECORD_UPDATED':
        return <RefreshCw className="w-4 h-4 text-amber-600" />;
      case 'RECORD_DELETED':
        return <Trash2 className="w-4 h-4 text-rose-600" />;
      case 'CERTIFICATION_ISSUED':
        return <Award className="w-4 h-4 text-emerald-600" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-4 h-4 text-purple-600" />;
      case 'USER_ACCOUNT':
        return <ShieldCheck className="w-4 h-4 text-indigo-600" />;
      case 'SYSTEM_EVENT':
      default:
        return <Info className="w-4 h-4 text-slate-600" />;
    }
  };

  const getTypeBadge = (type: NotificationType) => {
    switch (type) {
      case 'RECORD_CREATED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'RECORD_UPDATED':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'RECORD_DELETED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'CERTIFICATION_ISSUED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'ANNOUNCEMENT':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'USER_ACCOUNT':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'SYSTEM_EVENT':
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div id="cris-notification-center" className="space-y-5 animate-in fade-in duration-150">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Civil Registry Notification Center
              </h1>
              {unreadCount > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-100 text-rose-700 border border-rose-200">
                  {unreadCount} Unread
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  All Up to Date
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live audit tracking of civil registrations, certification issuances, administrative announcements, and security events.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          {unreadCount > 0 && (
            <button
              type="button"
              id="mark-all-read-btn"
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-blue-600" />
              <span>Mark All as Read</span>
            </button>
          )}

          {canPublishAnnouncement && (
            <button
              type="button"
              id="publish-announcement-btn"
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            >
              <Megaphone className="w-4 h-4 text-white" />
              <span>Publish Announcement</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="notification-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notification titles, messages, or registry numbers..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Read/Unread Status Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start md:self-auto">
            <button
              type="button"
              onClick={() => setReadFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                readFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setReadFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                readFilter === 'unread'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setReadFilter('read')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                readFilter === 'read'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Read
            </button>
          </div>

          {/* Type Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              id="notification-type-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="ALL">All Event Types</option>
              <option value="RECORD_CREATED">New Registrations</option>
              <option value="RECORD_UPDATED">Record Updates</option>
              <option value="RECORD_DELETED">Record Deletions</option>
              <option value="CERTIFICATION_ISSUED">Issued Certifications</option>
              <option value="ANNOUNCEMENT">Announcements</option>
              <option value="USER_ACCOUNT">User Accounts</option>
              <option value="SYSTEM_EVENT">System Events</option>
            </select>

            {/* Sort Order */}
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 transition cursor-pointer"
              title={`Sorting: ${sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Multi-Selection Action Bar */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-900">
                {selectedIds.length} notification{selectedIds.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkSelectedAsRead}
                className="px-3 py-1.5 bg-white border border-blue-300 hover:bg-blue-100 text-blue-900 font-bold rounded-lg transition cursor-pointer"
              >
                Mark as Read
              </button>
              <button
                type="button"
                onClick={handleRequestBulkDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Notifications List Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table / List Header */}
        <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="select-all-notifications"
              checked={
                sortedNotifications.length > 0 &&
                selectedIds.length === sortedNotifications.length
              }
              onChange={handleToggleSelectAll}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="select-all-notifications" className="font-bold text-slate-700 cursor-pointer">
              Select All ({sortedNotifications.length})
            </label>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            {unreadCount} unread out of {notifications.length} matching
          </span>
        </div>

        {/* Notification Cards */}
        {sortedNotifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Notifications Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No notifications matched your search "${searchQuery}". Try clearing filters.`
                : readFilter === 'unread'
                ? 'All notifications have been read. There are no pending unread notifications.'
                : 'No civil registry activities have been recorded in this category yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedNotifications.map((n) => {
              const isSelected = selectedIds.includes(n.id);
              return (
                <div
                  key={n.id}
                  className={`p-4 sm:p-5 transition flex items-start gap-3 sm:gap-4 group ${
                    isSelected
                      ? 'bg-blue-50/80'
                      : n.read
                      ? 'bg-white hover:bg-slate-50/60'
                      : 'bg-blue-50/30 hover:bg-blue-50/60 border-l-4 border-blue-600'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(n.id)}
                    className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    aria-label={`Select notification ${n.title}`}
                  />

                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${getTypeBadge(
                          n.type
                        )}`}
                      >
                        {n.type.replace(/_/g, ' ')}
                      </span>

                      {n.priority === 'urgent' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-rose-600 text-white shadow-2xs">
                          Urgent
                        </span>
                      )}
                      {n.priority === 'high' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-amber-500 text-white shadow-2xs">
                          High Priority
                        </span>
                      )}

                      {!n.read && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          Unread
                        </span>
                      )}

                      {n.relatedModule && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-medium uppercase">
                          Module: {n.relatedModule}
                          {n.relatedRecordNumber ? ` #${n.relatedRecordNumber}` : ''}
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-sm ${
                        n.read ? 'text-slate-900 font-semibold' : 'text-slate-950 font-bold'
                      }`}
                    >
                      {n.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>

                    {/* Metadata strip with DD MMM YYYY format */}
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <strong>{formatDateTimeDDMMMYYYY(n.createdAt)}</strong>
                      </span>

                      {n.actionByUsername && (
                        <span>
                          Triggered by: <strong className="text-slate-700">@{n.actionByUsername}</strong>
                        </span>
                      )}

                      {n.readAt && (
                        <span className="text-slate-400 italic">
                          (Read: {formatDateTimeDDMMMYYYY(n.readAt)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-1 shrink-0 self-start">
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(n.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100/70 rounded-lg transition cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}

                    {n.relatedModule &&
                      onNavigateToRecord &&
                      ['births', 'marriages', 'deaths', 'legal-instruments', 'certifications'].includes(
                        n.relatedModule
                      ) && (
                        <button
                          type="button"
                          onClick={() => onNavigateToRecord(n.relatedModule!, n.relatedRecordId)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100/70 rounded-lg transition cursor-pointer"
                          title="Jump to civil registry record"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={() => handleRequestSingleDelete(n)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 rounded-lg transition cursor-pointer"
                      title="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog Modal */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isBulkDeleteConfirm
                    ? `Delete ${selectedIds.length} Notifications?`
                    : 'Delete Notification?'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {isBulkDeleteConfirm
                    ? `Are you sure you want to delete the ${selectedIds.length} selected notifications? This operation cannot be undone.`
                    : `Are you sure you want to delete "${itemToDelete?.title}"? This record will be permanently removed from your feed.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-notification-btn"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Publish Official System Announcement
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Broadcast to civil registry officers and staff
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAnnouncementModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {announcementError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {announcementError}
              </div>
            )}

            <form onSubmit={handlePublishAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Announcement Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="e.g. System Maintenance Notice / Civil Registration Month"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Announcement Details / Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  placeholder="Type official notification message for municipal personnel..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority Level</label>
                  <select
                    value={announcementPriority}
                    onChange={(e) => setAnnouncementPriority(e.target.value as NotificationPriority)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Author Identity</label>
                  <input
                    type="text"
                    disabled
                    value={`${currentUser.name} (@${currentUser.username})`}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-announcement-btn"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Publish Announcement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

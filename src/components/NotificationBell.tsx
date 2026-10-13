import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  Baby,
  Heart,
  Cross,
  Scroll,
  Award,
  Megaphone,
  ShieldCheck,
  Info,
  ChevronRight,
  Check,
} from 'lucide-react';
import { CrisNotification, NotificationType, UserAccount } from '../types';
import { storageService } from '../services/storage';
import { formatDateTimeDDMMMYYYY } from '../utils/dateUtils';

interface NotificationBellProps {
  currentUser: UserAccount;
  onViewAllNotifications: () => void;
  onNavigateToRecord?: (category: string, recordId?: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUser,
  onViewAllNotifications,
  onNavigateToRecord,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<CrisNotification[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    const unread = storageService.getUnreadCount(currentUser);
    setUnreadCount(unread);
    const list = storageService.getNotifications(currentUser, {
      readStatus: filterMode === 'unread' ? 'unread' : 'all',
      limit: 8,
    });
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
    const unsubscribe = storageService.subscribeToNotifications(() => {
      loadNotifications();
    });

    // Polling backup every 8 seconds for background sync
    const interval = setInterval(() => {
      loadNotifications();
    }, 8000);

    const handleFocus = () => {
      loadNotifications();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [currentUser, filterMode]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    storageService.markNotificationAsRead(id, currentUser);
    loadNotifications();
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    storageService.markAllNotificationsAsRead(currentUser);
    loadNotifications();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      storageService.deleteNotification(id, currentUser);
      loadNotifications();
    } catch (err: any) {
      console.error('Delete error:', err);
    }
  };

  const handleItemClick = (notif: CrisNotification) => {
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    if (notif.relatedModule && ['births', 'marriages', 'deaths', 'legal-instruments', 'certifications'].includes(notif.relatedModule)) {
      setIsOpen(false);
      if (onNavigateToRecord) {
        onNavigateToRecord(notif.relatedModule, notif.relatedRecordId);
      }
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'RECORD_CREATED':
      case 'RECORD_UPDATED':
      case 'RECORD_DELETED':
        return <Baby className="w-3.5 h-3.5 text-blue-600" />;
      case 'CERTIFICATION_ISSUED':
        return <Award className="w-3.5 h-3.5 text-emerald-600" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="w-3.5 h-3.5 text-amber-600" />;
      case 'USER_ACCOUNT':
        return <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />;
      case 'SYSTEM_EVENT':
      default:
        return <Info className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getTypeBadgeClass = (type: NotificationType) => {
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
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        id="cris-notification-bell-btn"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className={`relative p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/30'
            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700 shadow-xs'
        }`}
        title="Civil Registry Notifications"
        aria-label="Open notifications menu"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4 transition-transform group-hover:scale-105" />

        {/* Unread Badge Counter */}
        {unreadCount > 0 && (
          <span
            id="notification-unread-badge"
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-600 border-2 border-slate-900 text-white text-[10px] font-black font-mono rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50 duration-150"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <div
          id="cris-notification-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden text-slate-900 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                      {unreadCount} unread
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400">Live civil registry activity feed</p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 transition cursor-pointer px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>

          {/* Quick Filter Strip */}
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('unread')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                  filterMode === 'unread'
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                )}
              </button>
            </div>

            <span className="text-[10px] text-slate-400 font-mono">
              Showing latest {notifications.length}
            </span>
          </div>

          {/* Notification List Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-xs font-semibold text-slate-700">All caught up!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {filterMode === 'unread'
                    ? 'No unread civil registry notifications.'
                    : 'No system notifications recorded yet.'}
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3 transition cursor-pointer flex items-start gap-3 group relative ${
                    n.read
                      ? 'bg-white hover:bg-slate-50'
                      : 'bg-blue-50/40 hover:bg-blue-50/70 border-l-3 border-blue-600'
                  }`}
                >
                  {/* Icon */}
                  <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${getTypeBadgeClass(
                          n.type
                        )}`}
                      >
                        {n.type.replace('_', ' ')}
                      </span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 inline-block" title="Unread" />
                      )}
                    </div>

                    <h4
                      className={`text-xs mt-1 leading-snug line-clamp-1 ${
                        n.read ? 'text-slate-800 font-semibold' : 'text-slate-950 font-bold'
                      }`}
                    >
                      {n.title}
                    </h4>

                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-mono">
                      <span>{formatDateTimeDDMMMYYYY(n.createdAt)}</span>
                      {n.actionByUsername && <span>&bull; @{n.actionByUsername}</span>}
                    </div>
                  </div>

                  {/* Quick Action Button (Right side hover) */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    {!n.read ? (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100/60 rounded transition cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(n.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded transition cursor-pointer"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with "View All Notifications" */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200/80 text-center">
            <button
              type="button"
              id="view-all-notifications-btn"
              onClick={() => {
                setIsOpen(false);
                onViewAllNotifications();
              }}
              className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-blue-700 hover:text-blue-800 shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View All Notifications</span>
              <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

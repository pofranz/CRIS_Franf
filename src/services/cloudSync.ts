import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  AnyRegistryRecord,
  IssuedCertification,
  SiteSettings,
  MunicipalCertificateTemplate,
  RegistryCategory,
} from '../types';
import { STORAGE_KEYS } from './storage';

// Helper to remove undefined properties which Firestore does not allow
function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  return JSON.parse(JSON.stringify(data));
}

/**
 * Sanitizes and enforces Firestore document constraints (max 1,048,576 bytes / 1 MiB).
 * If a record has large binary/base64 attachments or deep version histories,
 * it prunes them to strictly stay within cloud size limits (targeting < 700 KB).
 */
export function prepareRecordForFirestore(record: AnyRegistryRecord): any {
  if (!record) return record;
  const clean: any = cleanForFirestore(record);

  // 1. Sanitize nested versions: ensure historical snapshots don't nest recursive versions or duplicate heavy attachments
  if (Array.isArray(clean.versions)) {
    clean.versions = clean.versions.slice(-10).map((v: any) => {
      if (v?.snapshot) {
        const { versions: _v, pdfAttachment: snapPdf, ...restSnap } = v.snapshot;
        return {
          ...v,
          snapshot: {
            ...restSnap,
            ...(snapPdf ? { pdfAttachment: { ...snapPdf, dataUrl: '' } } : {}),
          },
        };
      }
      return v;
    });
  }

  // 2. Measure UTF-8 payload size
  let serialized = JSON.stringify(clean);
  // Firestore hard ceiling is 1,048,576 bytes. Target safety limit is 700 KB.
  const MAX_FIRESTORE_DOC_BYTES = 700 * 1024;

  if (serialized.length > MAX_FIRESTORE_DOC_BYTES) {
    // If pdfAttachment has a large base64 payload, strip dataUrl from Firestore
    // The attachment metadata (name, size, type, timestamp, uploadedBy) is preserved in the cloud,
    // while the client workstation retains the full base64 in local cache.
    if (clean.pdfAttachment?.dataUrl) {
      clean.pdfAttachment = {
        ...clean.pdfAttachment,
        dataUrl: '',
        storedLocally: true,
      };
      serialized = JSON.stringify(clean);
    }

    // If still over limit, trim version history to the most recent 3 entries
    if (serialized.length > MAX_FIRESTORE_DOC_BYTES && Array.isArray(clean.versions)) {
      clean.versions = clean.versions.slice(-3);
    }
  }

  return clean;
}

type SyncCallback = () => void;
const listeners: Set<SyncCallback> = new Set();

export function subscribeToCloudSync(cb: SyncCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifySubscribers() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('Error notifying sync subscriber:', e);
    }
  });
}

let isInitialized = false;
let isApplyingRemoteUpdate = false;

export const cloudSyncService = {
  isInitialized: () => isInitialized,

  /**
   * Initializes real-time two-way synchronization between Firestore and LocalStorage.
   */
  async init() {
    if (isInitialized) return;
    isInitialized = true;

    try {
      // 1. Set up real-time listener for registry_records
      const recordsCol = collection(db, 'registry_records');
      onSnapshot(recordsCol, (snapshot) => {
        if (snapshot.empty) {
          // If remote cloud collection is completely empty, populate it with local records
          this.seedInitialLocalDataToCloud();
          return;
        }

        if (isApplyingRemoteUpdate) return;
        isApplyingRemoteUpdate = true;

        try {
          const births: AnyRegistryRecord[] = [];
          const marriages: AnyRegistryRecord[] = [];
          const deaths: AnyRegistryRecord[] = [];
          const legals: AnyRegistryRecord[] = [];

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as AnyRegistryRecord;
            if (!data || !data.category) return;
            if (data.category === 'births') births.push(data);
            else if (data.category === 'marriages') marriages.push(data);
            else if (data.category === 'deaths') deaths.push(data);
            else if (data.category === 'legal-instruments') legals.push(data);
          });

          // Merge incoming cloud records with local records so that locally stored PDF attachments
          // (which are omitted from Firestore to comply with Firestore's 1MB document limit) are preserved locally
          const mergeWithLocalAttachments = (remoteList: AnyRegistryRecord[], storageKey: string): AnyRegistryRecord[] => {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return remoteList;
            try {
              const localList: AnyRegistryRecord[] = JSON.parse(raw);
              const localMap = new Map(localList.map((r) => [r.id, r]));
              return remoteList.map((remote) => {
                const local = localMap.get(remote.id);
                if (local?.pdfAttachment?.dataUrl && (!remote.pdfAttachment?.dataUrl || remote.pdfAttachment.dataUrl === '')) {
                  return {
                    ...remote,
                    pdfAttachment: {
                      ...(remote.pdfAttachment || local.pdfAttachment),
                      dataUrl: local.pdfAttachment.dataUrl,
                    },
                  };
                }
                return remote;
              });
            } catch {
              return remoteList;
            }
          };

          const finalBirths = mergeWithLocalAttachments(births, STORAGE_KEYS.BIRTHS);
          const finalMarriages = mergeWithLocalAttachments(marriages, STORAGE_KEYS.MARRIAGES);
          const finalDeaths = mergeWithLocalAttachments(deaths, STORAGE_KEYS.DEATHS);
          const finalLegals = mergeWithLocalAttachments(legals, STORAGE_KEYS.LEGAL);

          // Sync into localStorage
          localStorage.setItem(STORAGE_KEYS.BIRTHS, JSON.stringify(finalBirths));
          localStorage.setItem(STORAGE_KEYS.MARRIAGES, JSON.stringify(finalMarriages));
          localStorage.setItem(STORAGE_KEYS.DEATHS, JSON.stringify(finalDeaths));
          localStorage.setItem(STORAGE_KEYS.LEGAL, JSON.stringify(finalLegals));

          notifySubscribers();
        } catch (err) {
          console.warn('Error syncing remote records to local storage:', err);
        } finally {
          isApplyingRemoteUpdate = false;
        }
      }, (err) => {
        console.warn('Firestore records subscription warning:', err);
      });

      // 2. Set up real-time listener for issued_certifications
      const certsCol = collection(db, 'issued_certifications');
      onSnapshot(certsCol, (snapshot) => {
        if (isApplyingRemoteUpdate || snapshot.empty) return;
        isApplyingRemoteUpdate = true;
        try {
          const certs: IssuedCertification[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as IssuedCertification;
            if (data && data.certNumber) certs.push(data);
          });
          if (certs.length > 0) {
            localStorage.setItem(STORAGE_KEYS.CERTS, JSON.stringify(certs));
            notifySubscribers();
          }
        } catch (err) {
          console.error('Error syncing remote certs to local:', err);
        } finally {
          isApplyingRemoteUpdate = false;
        }
      }, (err) => {
        console.warn('Firestore certs subscription warning:', err);
      });

      // 3. Set up real-time listener for system_settings
      const settingsDocRef = doc(db, 'system_settings', 'global');
      onSnapshot(settingsDocRef, (docSnap) => {
        if (isApplyingRemoteUpdate || !docSnap.exists()) return;
        isApplyingRemoteUpdate = true;
        try {
          const remoteSettings = docSnap.data() as SiteSettings;
          if (remoteSettings && remoteSettings.officeName) {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(remoteSettings));
            notifySubscribers();
          }
        } catch (err) {
          console.error('Error syncing remote settings to local:', err);
        } finally {
          isApplyingRemoteUpdate = false;
        }
      }, (err) => {
        console.warn('Firestore settings subscription warning:', err);
      });

      // 4. Set up real-time listener for custom_templates
      const templatesCol = collection(db, 'custom_templates');
      onSnapshot(templatesCol, (snapshot) => {
        if (isApplyingRemoteUpdate || snapshot.empty) return;
        isApplyingRemoteUpdate = true;
        try {
          const templates: MunicipalCertificateTemplate[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as MunicipalCertificateTemplate;
            if (data && data.id) templates.push(data);
          });
          if (templates.length > 0) {
            localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
            notifySubscribers();
          }
        } catch (err) {
          console.error('Error syncing remote templates to local:', err);
        } finally {
          isApplyingRemoteUpdate = false;
        }
      }, (err) => {
        console.warn('Firestore templates subscription warning:', err);
      });

    } catch (err) {
      console.error('Failed to initialize Firestore cloud synchronization:', err);
    }
  },

  /**
   * Pushes initial local data up to Firestore if the cloud is blank.
   */
  async seedInitialLocalDataToCloud() {
    try {
      const getLocalList = (key: string): any[] => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      };

      const allRecords: AnyRegistryRecord[] = [
        ...getLocalList(STORAGE_KEYS.BIRTHS),
        ...getLocalList(STORAGE_KEYS.MARRIAGES),
        ...getLocalList(STORAGE_KEYS.DEATHS),
        ...getLocalList(STORAGE_KEYS.LEGAL),
      ];

      if (allRecords.length > 0) {
        const batch = writeBatch(db);
        allRecords.forEach((rec) => {
          if (!rec.id) return;
          const ref = doc(db, 'registry_records', rec.id);
          batch.set(ref, prepareRecordForFirestore(rec), { merge: true });
        });
        await batch.commit();
      }

      const allCerts: IssuedCertification[] = getLocalList(STORAGE_KEYS.CERTS);
      if (allCerts.length > 0) {
        const certBatch = writeBatch(db);
        allCerts.forEach((cert) => {
          if (!cert.id) return;
          const ref = doc(db, 'issued_certifications', cert.id);
          certBatch.set(ref, cleanForFirestore(cert), { merge: true });
        });
        await certBatch.commit();
      }

      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (rawSettings) {
        const settings = JSON.parse(rawSettings);
        await setDoc(doc(db, 'system_settings', 'global'), cleanForFirestore(settings), { merge: true });
      }
    } catch (err) {
      console.warn('Error during initial cloud seeding:', err);
    }
  },

  /**
   * Push a single registry record to the cloud.
   */
  async syncRecord(record: AnyRegistryRecord) {
    if (!record || !record.id) return;
    try {
      const ref = doc(db, 'registry_records', record.id);
      await setDoc(ref, prepareRecordForFirestore(record), { merge: true });
    } catch (err: any) {
      console.warn('Failed to sync record to Firestore:', err?.message || err);
    }
  },

  /**
   * Delete a record from the cloud.
   */
  async deleteRecord(id: string) {
    if (!id) return;
    try {
      const ref = doc(db, 'registry_records', id);
      await deleteDoc(ref);
    } catch (err: any) {
      console.warn('Failed to delete record from Firestore:', err?.message || err);
    }
  },

  /**
   * Push an issued certification to the cloud.
   */
  async syncCertification(cert: IssuedCertification) {
    if (!cert || !cert.id) return;
    try {
      const ref = doc(db, 'issued_certifications', cert.id);
      await setDoc(ref, cleanForFirestore(cert), { merge: true });
    } catch (err: any) {
      console.warn('Failed to sync certification to Firestore:', err?.message || err);
    }
  },

  /**
   * Delete an issued certification from the cloud.
   */
  async deleteCertification(id: string) {
    if (!id) return;
    try {
      const ref = doc(db, 'issued_certifications', id);
      await deleteDoc(ref);
    } catch (err: any) {
      console.warn('Failed to delete certification from Firestore:', err?.message || err);
    }
  },

  /**
   * Push site settings to the cloud.
   */
  async syncSettings(settings: SiteSettings) {
    if (!settings) return;
    try {
      const ref = doc(db, 'system_settings', 'global');
      await setDoc(ref, cleanForFirestore(settings), { merge: true });
    } catch (err: any) {
      console.warn('Failed to sync settings to Firestore:', err?.message || err);
    }
  },

  /**
   * Push a template to the cloud.
   */
  async syncTemplate(template: MunicipalCertificateTemplate) {
    if (!template || !template.id) return;
    try {
      const ref = doc(db, 'custom_templates', template.id);
      await setDoc(ref, cleanForFirestore(template), { merge: true });
    } catch (err: any) {
      console.warn('Failed to sync template to Firestore:', err?.message || err);
    }
  },

  /**
   * Delete a template from the cloud.
   */
  async deleteTemplate(id: string) {
    if (!id) return;
    try {
      const ref = doc(db, 'custom_templates', id);
      await deleteDoc(ref);
    } catch (err: any) {
      console.warn('Failed to delete template from Firestore:', err?.message || err);
    }
  },

  /**
   * Force manual push of all local data to Firestore.
   */
  async manualPushAllToCloud(): Promise<void> {
    await this.seedInitialLocalDataToCloud();
  },
};

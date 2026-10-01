/**
 * auditService.js — Quản lý Audit Logs với Retention Policy 14 ngày
 */
import {
  collection, doc, addDoc, getDocs, deleteDoc,
  query, orderBy, limit, startAfter, where,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { dbError, serverTimestamp } from './baseService';

const COL = 'auditLogs';
const RETENTION_DAYS = 14;

// ── GeoIP Cache ───────────────────────────────────────────────────────────────
let cachedIpInfo = { publicIpv4: null, publicIpv6: null };
let cachedLocInfo = { cityName: '', regionName: '', countryName: '' };
let ipFetched = false;

async function ensureIpFetched() {
  if (ipFetched) return;
  ipFetched = true;
  try {
    const r = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(4000) });
    const d = await r.json();
    if (d?.success) {
      cachedIpInfo.publicIpv4 = d.ip;
      cachedLocInfo = {
        cityName: d.city || '',
        regionName: d.region || '',
        countryName: d.country || '',
      };
    }
  } catch (_) {}
}

ensureIpFetched();

// ── Thêm log mới ──────────────────────────────────────────────────────────────
export async function addAuditLog(log) {
  try {
    await ensureIpFetched();
    const flatLoc = [cachedLocInfo.cityName, cachedLocInfo.regionName, cachedLocInfo.countryName]
      .filter(Boolean).join(', ') || 'Hệ thống';

    await addDoc(collection(db, COL), {
      time: new Date().toLocaleString('vi-VN'),
      timestamp: serverTimestamp(),
      ip: cachedIpInfo.publicIpv4 || '127.0.0.1',
      location: flatLoc,
      device: typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows') ? 'Desktop - Windows' : 'Mobile - Browser',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      ...log,
    });
  } catch (e) {
    dbError('Audit', 'addAuditLog', e);
  }
}

// ── Subscribe realtime (100 bản ghi gần nhất) ─────────────────────────────────
export function subscribeAuditLogs(callback) {
  const q = query(collection(db, COL), orderBy('timestamp', 'desc'), limit(100));
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => {
      dbError('Audit', 'subscribeAuditLogs', err);
      callback([]);
    }
  );
}

// ── Phân trang cursor-based ────────────────────────────────────────────────────
export async function loadAuditLogsPaginated({ pageSize = 50, lastDoc = null, categoryFilter = null } = {}) {
  try {
    let q = query(collection(db, COL), orderBy('timestamp', 'desc'), limit(pageSize));
    if (lastDoc) q = query(q, startAfter(lastDoc));
    if (categoryFilter) q = query(q, where('category', '==', categoryFilter));
    const snap = await getDocs(q);
    return {
      logs: snap.docs.map(d => ({ id: d.id, ...d.data() })),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.size === pageSize,
    };
  } catch (e) {
    dbError('Audit', 'loadAuditLogsPaginated', e);
    return { logs: [], lastDoc: null, hasMore: false };
  }
}

// ── Dọn log quá 14 ngày ───────────────────────────────────────────────────────
export async function cleanOldAuditLogs() {
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const q = query(collection(db, COL), orderBy('timestamp', 'asc'), limit(300));
    const snap = await getDocs(q);
    let deleted = 0;
    for (const d of snap.docs) {
      const ts = d.data().timestamp?.toDate?.()?.toISOString() || d.data().time || '';
      if (ts < cutoff) {
        await deleteDoc(d.ref);
        deleted++;
      } else break;
    }
    return deleted;
  } catch (e) {
    dbError('Audit', 'cleanOldAuditLogs', e);
    return 0;
  }
}

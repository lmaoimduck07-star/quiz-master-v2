/**
 * cleanupService.js — Công cụ dọn dẹp Database chủ động
 */
import {
  collection, doc, getDocs, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { dbError, batchWrite } from './baseService';
import { cleanOldAuditLogs } from './auditService';
import { normalizeAllExamIds, cleanupOrphanExamsAndQuestions } from './examService';
import { cleanStaleSessions } from './sessionService';

/**
 * Dọn dẹp toàn bộ dữ liệu stale, audit log cũ và đề thi/câu hỏi mồ côi
 */
export async function runDatabaseCleanup() {
  const report = {
    staleSessions: 0,
    oldAuditLogs: 0,
    normalizedExamIds: 0,
    ghostExamsDeleted: 0,
    orphanExamsDeleted: 0,
    orphanQuestionsDeleted: 0,
    errors: [],
  };

  // 1. Dọn session cũ
  try {
    await cleanStaleSessions();
    report.staleSessions = 1;
  } catch (e) {
    dbError('Cleanup', 'staleSessions', e);
    report.errors.push(`Session cleanup: ${e.message}`);
  }

  // 2. Xóa audit log cũ hơn 14 ngày
  try {
    report.oldAuditLogs = await cleanOldAuditLogs();
  } catch (e) {
    report.errors.push(`Audit log cleanup: ${e.message}`);
  }

  // 3. Chuẩn hóa ExamID
  try {
    const result = await normalizeAllExamIds();
    report.normalizedExamIds = result?.fixed || 0;
    report.ghostExamsDeleted = result?.ghostDeleted || 0;
  } catch (e) {
    report.errors.push(`Exam ID normalization: ${e.message}`);
  }

  // 4. Dọn dẹp đề thi và câu hỏi của các môn học không còn tồn tại trong hệ thống
  try {
    const orphanResult = await cleanupOrphanExamsAndQuestions();
    report.orphanExamsDeleted = orphanResult?.deletedExams || 0;
    report.orphanQuestionsDeleted = orphanResult?.deletedQuestions || 0;
  } catch (e) {
    report.errors.push(`Orphan exams cleanup: ${e.message}`);
  }

  return report;
}

/**
 * mistakeManager.js
 * Quản lý "Sổ tay câu sai" — lưu và đọc các câu hỏi học sinh làm sai,
 * phân loại độc lập theo từng môn học (subjectId) và từng bài thi (examId).
 *
 * Cấu trúc localStorage:
 *   qm_mistakes_<userId> = {
 *     "<subjectId>": [
 *       { id, examId, subjectId, type, text, options, correctAnswer, ... },
 *       ...
 *     ]
 *   }
 */

const STORAGE_PREFIX = 'qm_mistakes_';

/**
 * Đọc toàn bộ sổ tay câu sai của user.
 */
function _loadAll(userId) {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Ghi toàn bộ sổ tay câu sai của user.
 */
function _saveAll(userId, data) {
  if (!userId) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(data));
  } catch (e) {
    console.error('[mistakeManager] Failed to save:', e);
  }
}

/**
 * Tạo key định danh duy nhất cho từng câu hỏi theo bài thi để tránh trùng ID (ví dụ q_1, q_2 giữa các bài)
 */
function _makeQuestionKey(examId, qId) {
  return `${examId || 'common'}_${qId}`;
}

/**
 * Lưu danh sách câu làm sai vào sổ tay theo môn và bài thi.
 * Định danh câu sai theo (examId + questionId) để các bài thi có cùng số thứ tự câu (1, 2, 3...)
 * không bao giờ ghi đè hoặc làm mất câu của nhau.
 *
 * @param {string} userId
 * @param {string} subjectId  — ID của môn học
 * @param {Array}  questions  — Danh sách câu hỏi (những câu isCorrect === false)
 * @param {string} [examId]   — ID của bài thi (tùy chọn)
 */
export function saveMistakes(userId, subjectId, questions, examId = null) {
  if (!userId || !subjectId || !questions?.length) return;

  const all = _loadAll(userId);
  const existing = all[subjectId] || [];

  // Dùng composite key (examId + q.id) để quản lý độc lập từng bài thi
  const existingMap = new Map(existing.map(q => [_makeQuestionKey(q.examId, q.id), q]));

  for (const q of questions) {
    if (!q.id && q.id !== 0) continue;
    const targetExamId = q.examId || examId || null;
    const key = _makeQuestionKey(targetExamId, q.id);

    existingMap.set(key, {
      id: q.id,
      examId: targetExamId,
      subjectId: subjectId, // Luôn lưu subjectId để có thể tra cứu và xóa theo môn
      type: q.type || 'single',
      text: q.text || q.content || q.question || '',
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      pairs: q.pairs,
      groups: q.groups,
      answers: q.answers,
      items: q.items,
      statements: q.statements,
    });
  }

  all[subjectId] = Array.from(existingMap.values());
  _saveAll(userId, all);
}

/**
 * Lấy toàn bộ danh sách câu sai của user.
 * Nếu truyền `validSubjectIds`, chỉ trả về câu sai của các môn ĐANG TỒN TẠI trong hệ thống,
 * đồng thời tự động dọn dẹp các môn đã bị xóa khỏi localStorage.
 *
 * @param {string} userId
 * @param {Array<string>|Set<string>} [validSubjectIds]
 * @returns {Array}
 */
export function getMistakes(userId, validSubjectIds = null) {
  if (!userId) return [];
  const all = _loadAll(userId);
  const result = [];
  const validSet = validSubjectIds ? new Set(validSubjectIds) : null;

  let hasOrphans = false;

  for (const subId in all) {
    // Nếu có danh sách môn hợp lệ và môn này không tồn tại trong hệ thống -> đánh dấu dọn dẹp
    if (validSet && !validSet.has(subId)) {
      delete all[subId];
      hasOrphans = true;
      continue;
    }

    if (Array.isArray(all[subId])) {
      all[subId].forEach(item => {
        result.push({
          ...item,
          subjectId: item.subjectId || subId,
        });
      });
    }
  }

  // Tự động lưu lại nếu đã loại bỏ câu sai của môn không tồn tại
  if (hasOrphans) {
    _saveAll(userId, all);
  }

  return result;
}

/**
 * Lấy toàn bộ danh sách câu sai của một môn cụ thể.
 *
 * @param {string} userId
 * @param {string} subjectId
 * @returns {Array}
 */
export function getMistakesBySubject(userId, subjectId) {
  if (!userId || !subjectId) return [];
  const all = _loadAll(userId);
  return all[subjectId] || [];
}

/**
 * Lấy danh sách câu sai của riêng một bài thi cụ thể (examId).
 *
 * @param {string} userId
 * @param {string} subjectId
 * @param {string} examId
 * @returns {Array}
 */
export function getMistakesByExam(userId, subjectId, examId) {
  if (!userId || !subjectId || !examId) return [];
  const list = getMistakesBySubject(userId, subjectId);
  return list.filter(q => q.examId === examId);
}

/**
 * Lấy số lượng câu sai của riêng một bài thi cụ thể.
 *
 * @param {string} userId
 * @param {string} subjectId
 * @param {string} examId
 * @returns {number}
 */
export function getMistakeCountByExam(userId, subjectId, examId) {
  return getMistakesByExam(userId, subjectId, examId).length;
}

/**
 * Lấy tổng số lượng câu sai của một môn học.
 *
 * @param {string} userId
 * @param {string} subjectId
 * @returns {number}
 */
export function getMistakeCountBySubject(userId, subjectId) {
  return getMistakesBySubject(userId, subjectId).length;
}

/**
 * Xóa danh sách các câu đã làm đúng khỏi môn học (hỗ trợ theo examId nếu có).
 *
 * @param {string} userId
 * @param {string} subjectId
 * @param {Array<string|number>} correctQuestionIds
 * @param {string} [examId]
 */
export function removeMistakesByIds(userId, subjectId, correctQuestionIds, examId = null) {
  if (!userId || !correctQuestionIds?.length) return;
  const all = _loadAll(userId);
  const idSet = new Set(correctQuestionIds.map(String));

  if (subjectId && all[subjectId]) {
    all[subjectId] = all[subjectId].filter(q => {
      if (examId && q.examId && q.examId !== examId) return true;
      return !idSet.has(String(q.id));
    });
    if (all[subjectId].length === 0) {
      delete all[subjectId];
    }
  } else {
    // Nếu subjectId không tìm thấy, quét qua tất cả các môn trong sổ tay
    for (const subId of Object.keys(all)) {
      if (Array.isArray(all[subId])) {
        all[subId] = all[subId].filter(q => {
          if (examId && q.examId && q.examId !== examId) return true;
          return !idSet.has(String(q.id));
        });
        if (all[subId].length === 0) {
          delete all[subId];
        }
      }
    }
  }
  _saveAll(userId, all);
}

/**
 * Xóa toàn bộ câu sai của riêng một bài thi cụ thể.
 *
 * @param {string} userId
 * @param {string} subjectId
 * @param {string} examId
 */
export function clearExamMistakes(userId, subjectId, examId) {
  if (!userId || !subjectId || !examId) return;
  const all = _loadAll(userId);
  const existing = all[subjectId] || [];
  all[subjectId] = existing.filter(q => q.examId !== examId);
  if (all[subjectId].length === 0) {
    delete all[subjectId];
  }
  _saveAll(userId, all);
}

/**
 * Xóa toàn bộ câu sai của một môn học cụ thể cho một user.
 *
 * @param {string} userId
 * @param {string} subjectId
 */
export function clearSubjectMistakes(userId, subjectId) {
  if (!userId || !subjectId) return;
  const all = _loadAll(userId);
  delete all[subjectId];
  _saveAll(userId, all);
}

/**
 * Xóa toàn bộ câu sai của một môn học khỏi TẤT CẢ user trong localStorage.
 * Được gọi khi Giảng viên xóa một môn học.
 *
 * @param {string} subjectId
 */
export function deleteMistakesBySubject(subjectId) {
  if (!subjectId) return;
  try {
    const keysToProcess = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToProcess.push(key);
      }
    }

    for (const storageKey of keysToProcess) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) continue;
        const data = JSON.parse(raw);
        if (data && data[subjectId]) {
          delete data[subjectId];
          localStorage.setItem(storageKey, JSON.stringify(data));
        }
      } catch (_) {}
    }
  } catch (e) {
    console.error('[mistakeManager] Failed to delete mistakes for subject:', e);
  }
}

/**
 * Dọn dẹp triệt để: Xóa mọi câu sai thuộc bất kỳ môn học nào KHÔNG nằm trong validSubjectIds.
 *
 * @param {Array<string>} validSubjectIds
 */
export function cleanupOrphanMistakes(validSubjectIds) {
  if (!Array.isArray(validSubjectIds)) return;
  const validSet = new Set(validSubjectIds);

  try {
    const keysToProcess = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToProcess.push(key);
      }
    }

    for (const storageKey of keysToProcess) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) continue;
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') continue;

        let hasChanges = false;
        for (const subId of Object.keys(data)) {
          if (!validSet.has(subId)) {
            delete data[subId];
            hasChanges = true;
          }
        }

        if (hasChanges) {
          localStorage.setItem(storageKey, JSON.stringify(data));
        }
      } catch (_) {}
    }
  } catch (e) {
    console.error('[mistakeManager] Failed to cleanup orphan mistakes:', e);
  }
}

/**
 * Xóa toàn bộ sổ tay câu sai của user.
 *
 * @param {string} userId
 */
export function clearAllMistakes(userId) {
  if (!userId) return;
  try {
    localStorage.removeItem(STORAGE_PREFIX + userId);
  } catch (_) {}
}

import { useRef, useCallback } from 'react';
import { saveAnswer } from '../services/db/sessionService';

/**
 * useAnswerSync — Debounce 800ms khi ghi đáp án vào Firestore subcollection answers/
 */
export function useAnswerSync(sessionId) {
  const debounceTimersRef = useRef({});

  const syncAnswer = useCallback((questionId, value) => {
    if (!sessionId || !questionId) return;

    if (debounceTimersRef.current[questionId]) {
      clearTimeout(debounceTimersRef.current[questionId]);
    }

    debounceTimersRef.current[questionId] = setTimeout(() => {
      saveAnswer(sessionId, questionId, value);
      delete debounceTimersRef.current[questionId];
    }, 800);
  }, [sessionId]);

  const flushAnswer = useCallback((questionId, value) => {
    if (!sessionId || !questionId) return;
    if (debounceTimersRef.current[questionId]) {
      clearTimeout(debounceTimersRef.current[questionId]);
      delete debounceTimersRef.current[questionId];
    }
    saveAnswer(sessionId, questionId, value);
  }, [sessionId]);

  return { syncAnswer, flushAnswer };
}

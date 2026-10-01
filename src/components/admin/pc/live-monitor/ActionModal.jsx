import React, { useState } from 'react';
import { Modal } from '../../../common/Modal';
import { Button } from '../../../common/Button';
import { Input } from '../../../common/Input';
import { Lock, MessageSquare, Trash2, AlertTriangle } from 'lucide-react';

export function ActionModal({ modal, onClose, onConfirm }) {
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!modal) return null;

  const { type, session } = modal;
  const candidateName = session?.studentName || session?.uid || 'Học sinh';

  const handleExecute = async () => {
    setLoading(true);
    try {
      if (type === 'terminate') {
        await onConfirm('terminate', session);
      } else if (type === 'sendMsg') {
        if (!messageText.trim()) return;
        await onConfirm('sendMsg', session, messageText.trim());
        setMessageText('');
      } else if (type === 'delete') {
        await onConfirm('delete', session);
      }
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={!!modal}
      onClose={onClose}
      title={
        type === 'terminate' ? 'Khóa phiên thi từ xa' :
        type === 'sendMsg' ? 'Gửi cảnh báo đến thí sinh' :
        'Xóa thẻ phiên thi'
      }
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {type === 'terminate' && (
          <div className="space-y-3">
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 dark:text-red-300">
                Bạn có chắc chắn muốn khóa bài thi của <strong>{candidateName}</strong>? Thí sinh sẽ bị dừng làm bài ngay lập tức.
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hành động này được lưu lại trong Nhật ký Hệ thống (Audit Log).
            </p>
          </div>
        )}

        {type === 'sendMsg' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Gửi thông điệp khẩn cấp tới màn hình của <strong>{candidateName}</strong>:
            </p>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Nhập nội dung nhắc nhở (Ví dụ: Bạn đã rời toàn màn hình 2 lần, vui lòng tập trung làm bài)..."
              rows={4}
              className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-800 dark:text-slate-200"
            />
          </div>
        )}

        {type === 'delete' && (
          <div className="space-y-3">
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl flex items-start gap-3">
              <Trash2 className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200">
                Xóa thẻ phiên thi của <strong>{candidateName}</strong> khỏi màn hình giám sát? Dữ liệu câu trả lời tạm thời sẽ được dọn dẹp.
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy bỏ
          </Button>
          <Button
            variant={type === 'terminate' ? 'danger' : type === 'delete' ? 'danger' : 'primary'}
            onClick={handleExecute}
            loading={loading}
            icon={type === 'terminate' ? Lock : type === 'sendMsg' ? MessageSquare : Trash2}
          >
            {type === 'terminate' ? 'Xác nhận khóa' : type === 'sendMsg' ? 'Gửi tin nhắn' : 'Xác nhận xóa'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

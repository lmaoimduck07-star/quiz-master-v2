import React from 'react';
import { Activity, Clock, Shield, Lock, MessageSquare, Eye } from 'lucide-react';
import { Card, CardContent } from '../../common/Card';

export function LiveMonitorStandby() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto">
          <Clock className="h-8 w-8 animate-pulse" />
        </div>

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
            ⏳ Chế độ Standby
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Giám Sát Phòng Thi Realtime (Full Control)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-2 leading-relaxed">
            Hệ thống LiveMonitor thời gian thực dành cho Giảng viên đã được hoàn thiện kiến trúc nền tảng và hiện đang được đặt ở chế độ <strong>Standby</strong> để sẵn sàng kích hoạt trong đợt thi chính thức.
          </p>
        </div>
      </div>

      {/* Feature Preview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Eye className="h-5 w-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-800 dark:text-white">Giám sát Spectator</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Theo dõi từng câu trả lời và thao tác trên đề thi của sinh viên theo thời gian thực.
          </p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center">
            <Lock className="h-5 w-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-800 dark:text-white">Khóa thi từ xa</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Khóa ngay phiên làm bài khi phát hiện hành vi gian lận hoặc vi phạm quy chế thi.
          </p>
        </Card>

        <Card className="p-5 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-800 dark:text-white">Gửi thông điệp cảnh báo</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gửi nhắc nhở trực tiếp hiển thị tức thì trên màn hình làm bài của sinh viên.
          </p>
        </Card>
      </div>
    </div>
  );
}

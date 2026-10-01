import React from 'react';
import { Monitor, LogOut } from 'lucide-react';
import { Button } from '../../common/Button';
import { useAuth } from '../../../context/AuthContext';

export function LecturerMobileBlock() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white text-center">
      <div className="max-w-sm w-full space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto border border-brand-500/30">
          <Monitor className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-black">Yêu Cầu Thiết Bị Máy Tính</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Phân hệ Giảng viên (Soạn thảo đề thi, Import Word/AI, Giám sát và Chấm điểm) yêu cầu thao tác trên máy tính hoặc laptop để có trải nghiệm tốt nhất.
        </p>
        <div className="pt-2">
          <Button variant="outline" onClick={logout} icon={LogOut} className="w-full">
            Đăng xuất
          </Button>
        </div>
      </div>
    </div>
  );
}

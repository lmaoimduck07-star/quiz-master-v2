import React, { useState, useEffect } from 'react';
import { Shield, Search, RefreshCw, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../../common/Card';
import { Badge } from '../../common/Badge';
import { subscribeAuditLogs } from '../../../services/db/auditService';
import { formatDateTime } from '../../../utils/helpers';

export function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const unsub = subscribeAuditLogs((list) => {
      setLogs(list || []);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const text = `${log.user || ''} ${log.action || ''} ${log.ip || ''}`.toLowerCase();
    if (!text.includes(search.toLowerCase())) return false;
    if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-3.5 w-full flex-1 flex flex-col">
      {/* Header - Nhỏ gọn, vừa vặn */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 px-5 py-3 rounded-2xl shadow-sm w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Nhật Ký Hoạt Động Hệ Thống (Audit Log)
              <span className="text-[11px] px-2 py-0.2 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold border border-violet-500/20">
                {logs.length} bản ghi
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lịch sử đăng nhập, phân quyền, cấu hình và an ninh hệ thống
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm hành động, người dùng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-200"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-700 dark:text-slate-200 font-medium cursor-pointer shrink-0"
          >
            <option value="all">Tất cả danh mục</option>
            <option value="Auth">Xác thực (Auth)</option>
            <option value="Exam">Thi cử (Exam)</option>
            <option value="Security">Bảo mật (Security)</option>
            <option value="System">Hệ thống (System)</option>
          </select>
        </div>
      </div>

      {/* Log list - Cuộn bên trong để fit 1 màn hình */}
      <Card className="border border-slate-200/90 dark:border-slate-800/90 shadow-sm overflow-hidden flex-1 flex flex-col w-full">
        <CardContent className="p-0 flex-1 flex flex-col">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center flex-1 gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-brand-500" />
              Đang tải nhật ký hệ thống...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center flex-1">
              Chưa có bản ghi nhật ký nào.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-230px)]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-2.5">Thời gian</th>
                    <th className="px-5 py-2.5">Người thực hiện</th>
                    <th className="px-5 py-2.5">Danh mục</th>
                    <th className="px-5 py-2.5">Hành động</th>
                    <th className="px-5 py-2.5">Mức độ</th>
                    <th className="px-5 py-2.5">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium">
                  {filteredLogs.map((log) => {
                    const isWarning = log.severity === 'Warning';
                    const isCritical = log.severity === 'Critical';

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-2.5 text-slate-400 text-[11px] whitespace-nowrap">
                          {log.time || formatDateTime(log.timestamp)}
                        </td>
                        <td className="px-5 py-2.5 font-bold text-slate-800 dark:text-slate-200">
                          {log.user || 'Hệ thống'}
                        </td>
                        <td className="px-5 py-2.5">
                          <span className="font-semibold text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {log.category || 'System'}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 font-semibold text-slate-900 dark:text-white max-w-sm truncate">
                          {log.action}
                        </td>
                        <td className="px-5 py-2.5">
                          {isCritical ? (
                            <Badge variant="danger" className="text-[10px] px-2 py-0.2">Nghiêm trọng</Badge>
                          ) : isWarning ? (
                            <Badge variant="warning" className="text-[10px] px-2 py-0.2">Cảnh báo</Badge>
                          ) : (
                            <Badge variant="info" className="text-[10px] px-2 py-0.2">Thông tin</Badge>
                          )}
                        </td>
                        <td className="px-5 py-2.5 font-mono text-slate-400 text-[10px]">
                          {log.ip || '127.0.0.1'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

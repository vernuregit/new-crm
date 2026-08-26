import { useState, useEffect, useMemo } from 'react';
import { useUserStore } from '../../stores/userStore';
import { subscribeMyPayslips } from './services/payslipsService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/layout/PageHeader';
import { Receipt, Download, IndianRupee } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/services/firebaseService';
import {
  classifyApprovedLeaveByDate,
  resolveLeaveLimits,
} from '../team/services/leaveEntitlementUtils';

export const PayslipsPage = () => {
  const user = useUserStore(state => state.user);
  const userDoc = useUserStore(state => state.userDoc);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [leaveRequests, setLeaveRequests] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeMyPayslips(user.uid, (data) => {
      setPayslips(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'leaveRequests'),
      (snap) => setLeaveRequests(snap.docs.map((d) => ({ ...d.data(), leaveId: d.id }))),
      () => setLeaveRequests([])
    );
    return () => unsub();
  }, []);

  const liveLopByMonth = useMemo(() => {
    const classified = classifyApprovedLeaveByDate(
      leaveRequests,
      {
        employeeId: user?.uid || userDoc?.uid,
        uid: user?.uid || userDoc?.uid,
        employeeEmail: user?.email || userDoc?.email || '',
        employeeName: userDoc?.displayName || user?.displayName || '',
      },
      resolveLeaveLimits(userDoc)
    );
    const map = {};
    Object.entries(classified).forEach(([date, info]) => {
      if (info?.status !== 'lop') return;
      const key = date.slice(0, 7);
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [leaveRequests, user, userDoc]);

  const years = useMemo(() => {
    const y = new Set(payslips.map(p => p.year));
    y.add(new Date().getFullYear());
    return Array.from(y).sort((a, b) => b - a);
  }, [payslips]);

  const filteredPayslips = useMemo(() => {
    return payslips.filter(p => p.year === selectedYear);
  }, [payslips, selectedYear]);

  const totalEarned = useMemo(() => {
    return filteredPayslips.reduce((sum, p) => sum + (p.netSalary || 0), 0);
  }, [filteredPayslips]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="space-y-6">
      <PageHeader title="My Payslips" description="View and download your monthly salary slips." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-1 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-[#12151E] border-purple-100 dark:border-purple-900/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <IndianRupee className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Earned ({selectedYear})</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalEarned)}
          </p>
        </Card>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {years.map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              selectedYear === year 
                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="overflow-hidden">
          <div className="p-0">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 animate-pulse">
                <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="w-10 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        </Card>
      ) : filteredPayslips.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
          <Receipt className="w-12 h-12 mb-4 text-slate-400 dark:text-slate-500" />
          <p className="text-lg font-medium text-slate-900 dark:text-white mb-1">No payslips available for {selectedYear}.</p>
          <p>Contact HR if you believe this is an error.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Month</th>
                  <th className="px-6 py-4 font-medium">Gross Salary</th>
                  <th className="px-6 py-4 font-medium">Deductions</th>
                  <th className="px-6 py-4 font-medium">Net Salary</th>
                  <th className="px-6 py-4 font-medium">Unpaid leave (LOP)</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPayslips.map(payslip => (
                  <tr key={payslip.id} className="bg-white dark:bg-[#12151E] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {monthNames[payslip.month - 1]} {payslip.year}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {formatCurrency(payslip.grossSalary)}
                    </td>
                    <td className="px-6 py-4 text-red-600 dark:text-red-400">
                      -{formatCurrency(payslip.deductions)}
                    </td>
                    <td className="px-6 py-4 font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(payslip.netSalary)}
                    </td>
                    <td className="px-6 py-4 text-violet-700 dark:text-violet-300">
                      {(() => {
                        const stored = payslip.lopDays ?? payslip.unpaidLeaveDays
                        if (stored != null) return `${stored} day${stored === 1 ? '' : 's'}`
                        const key = `${payslip.year}-${String(payslip.month).padStart(2, '0')}`
                        const live = liveLopByMonth[key] || 0
                        return `${live} day${live === 1 ? '' : 's'}`
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {payslip.pdfURL ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(payslip.pdfURL, '_blank')}
                          className="flex items-center gap-2 ml-auto"
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">Download</span>
                        </Button>
                      ) : (
                        <span title="PDF not available">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled
                            className="flex items-center gap-2 ml-auto opacity-50 cursor-not-allowed"
                          >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Download</span>
                          </Button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

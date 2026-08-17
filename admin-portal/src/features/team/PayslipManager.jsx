import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { TeamSubNav } from './components/TeamSubNav';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { getEmployees } from './services/teamService';
import { db, storage } from '../../shared/services/firebaseService';
import { useUserStore } from '../../stores/userStore';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FileText, Download, Trash2, CheckCircle, Upload, IndianRupee } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

export const PayslipManager = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeUid, setSelectedEmployeeUid] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [payslips, setPayslips] = useState([]);
  const [loadingPayslips, setLoadingPayslips] = useState(false);

  const { user } = useUserStore();

  // Form State
  const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [year, setYear] = useState(CURRENT_YEAR);
  const [grossSalary, setGrossSalary] = useState('');
  const [deductions, setDeductions] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const netSalary = (Number(grossSalary) || 0) - (Number(deductions) || 0);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const data = await getEmployees();
        setEmployees(data || []);
      } catch (error) {
        console.error('Error fetching employees', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!selectedEmployeeUid) {
      setPayslips([]);
      return;
    }

    setLoadingPayslips(true);
    const payslipsRef = collection(db, `payslips/${selectedEmployeeUid}/records`);
    const q = query(payslipsRef, orderBy('year', 'desc'), orderBy('month', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayslips(records);
      setLoadingPayslips(false);
    }, (error) => {
      console.error('Error fetching payslips', error);
      setLoadingPayslips(false);
    });

    return () => unsubscribe();
  }, [selectedEmployeeUid]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeUid) return;
    
    setSubmitting(true);
    setSuccessMsg('');
    try {
      let pdfURL = null;
      if (file) {
        const fileRef = ref(storage, `payslips/${selectedEmployeeUid}/${year}-${month}.pdf`);
        await uploadBytes(fileRef, file);
        pdfURL = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, `payslips/${selectedEmployeeUid}/records`), {
        month: Number(month),
        year: Number(year),
        grossSalary: Number(grossSalary),
        deductions: Number(deductions),
        netSalary,
        currency: 'INR',
        pdfURL,
        generatedAt: serverTimestamp(),
        createdBy: user?.displayName || 'Admin'
      });

      setSuccessMsg('Payslip sent successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      
      // Reset form (keep month/year)
      setGrossSalary('');
      setDeductions('');
      setFile(null);
      const fileInput = document.getElementById('pdf-upload');
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Error saving payslip', error);
      alert('Failed to send payslip.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (payslipId) => {
    if (window.confirm('Are you sure you want to delete this payslip?')) {
      try {
        await deleteDoc(doc(db, `payslips/${selectedEmployeeUid}/records`, payslipId));
      } catch (error) {
        console.error('Error deleting payslip', error);
        alert('Failed to delete payslip.');
      }
    }
  };

  const selectedEmployee = employees.find(e => e.uid === selectedEmployeeUid);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Payslip Manager" 
        description="Send monthly payslips to employees." 
      />
      <TeamSubNav />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">Select Employee</h3>
            <div>
              {loading ? (
                <div className="h-10 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md"></div>
              ) : (
                <select
                  value={selectedEmployeeUid}
                  onChange={(e) => setSelectedEmployeeUid(e.target.value)}
                  className="w-full flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#12151E] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.uid} value={emp.uid}>
                      {emp.displayName || emp.email}
                    </option>
                  ))}
                </select>
              )}

              {selectedEmployee && (
                <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold">
                      {selectedEmployee.displayName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {selectedEmployee.displayName}
                      </div>
                      <div className="text-sm text-slate-500">
                        {selectedEmployee.email}
                      </div>
                    </div>
                  </div>
                  {selectedEmployee.department && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {selectedEmployee.department}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!selectedEmployeeUid ? (
            <Card className="flex flex-col items-center justify-center h-64 text-slate-500">
              <FileText className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />
              <p>Select an employee to manage payslips</p>
            </Card>
          ) : (
            <>
              <Card className="p-5 space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">Add New Payslip</h3>
                <div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {successMsg && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md flex items-center text-sm mb-4">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {successMsg}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Month</label>
                        <select
                          value={month}
                          onChange={(e) => setMonth(Number(e.target.value))}
                          className="w-full flex h-10 rounded-md border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#12151E] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {MONTHS.map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Year</label>
                        <select
                          value={year}
                          onChange={(e) => setYear(Number(e.target.value))}
                          className="w-full flex h-10 rounded-md border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#12151E] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {YEARS.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gross Salary (₹)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input 
                            type="number"
                            required
                            min="0"
                            placeholder="0.00"
                            value={grossSalary}
                            onChange={(e) => setGrossSalary(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Deductions (₹)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input 
                            type="number"
                            required
                            min="0"
                            placeholder="0.00"
                            value={deductions}
                            onChange={(e) => setDeductions(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Net Salary (₹)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-emerald-500" />
                          <Input 
                            type="text"
                            readOnly
                            value={netSalary}
                            className="pl-9 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 font-semibold border-emerald-200 dark:border-emerald-800"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payslip PDF (Optional)</label>
                      <div className="flex items-center space-x-4">
                        <Input 
                          id="pdf-upload"
                          type="file" 
                          accept="application/pdf"
                          onChange={handleFileChange}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={submitting}>
                        {submitting ? 'Sending...' : 'Send Payslip'}
                      </Button>
                    </div>
                  </form>
                </div>
              </Card>

              <Card className="p-5 space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">Payslip History</h3>
                <div>
                  {loadingPayslips ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" />
                      ))}
                    </div>
                  ) : payslips.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      No payslips sent yet for this employee.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Period</th>
                            <th className="px-4 py-3">Gross</th>
                            <th className="px-4 py-3">Deductions</th>
                            <th className="px-4 py-3">Net</th>
                            <th className="px-4 py-3">PDF</th>
                            <th className="px-4 py-3">Created By</th>
                            <th className="px-4 py-3 rounded-tr-lg"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {payslips.map(payslip => (
                            <tr key={payslip.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                                {MONTHS[payslip.month - 1]} {payslip.year}
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                ₹{payslip.grossSalary?.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                ₹{payslip.deductions?.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                                ₹{payslip.netSalary?.toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                {payslip.pdfURL ? (
                                  <a href={payslip.pdfURL} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center space-x-1">
                                    <Download className="w-4 h-4" />
                                    <span>View</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400">N/A</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-xs">
                                {payslip.createdBy}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button 
                                  onClick={() => handleDelete(payslip.id)}
                                  className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  title="Delete Payslip"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

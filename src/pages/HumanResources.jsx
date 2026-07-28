import React, { useContext, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit,
  FileText,
  MessageCircle,
  Plus,
  Printer,
  Search,
  Target,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import { LanguageContext } from '../context/LanguageContext';
import { formatCurrency } from '../utils/formatters';

const initialEmployeeForm = {
  fullName: '',
  phone: '',
  email: '',
  role: '',
  department: '',
  performanceMode: 'Attendance',
  salary: 0,
  payFrequency: 'Monthly',
  startDate: new Date().toISOString().slice(0, 10),
  emergencyContact: '',
  notes: '',
  status: 'Active',
};

const initialGoalForm = {
  employeeId: '',
  title: '',
  description: '',
  dueDate: new Date().toISOString().slice(0, 10),
  status: 'Pending',
  progress: 0,
  notes: '',
};

const initialPaymentForm = {
  employeeId: '',
  type: 'Salary',
  description: '',
  amount: 0,
  dueDate: new Date().toISOString().slice(0, 10),
  periodicity: 'One-time',
  occurrences: 1,
  periodStart: '',
  periodEnd: '',
  method: '',
  status: 'Pending',
  notes: '',
};

const initialAttendanceForm = {
  employeeId: '',
  date: new Date().toISOString().slice(0, 10),
  status: 'Present',
  checkIn: '',
  checkOut: '',
  notes: '',
};

const normalizeWhatsAppNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 9 && digits.startsWith('8')) return `258${digits}`;
  return digits;
};

const whatsappHref = (phone, message) => {
  const number = normalizeWhatsAppNumber(phone);
  if (!number) return '';
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB').format(new Date(value));
};

const paymentPeriodicities = ['One-time', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];
const goalStatuses = ['Pending', 'In Progress', 'Completed', 'Missed', 'Cancelled'];

export const HumanResources = () => {
  const {
    employees,
    hrPayments,
    payrollSheet,
    workGoals,
    attendanceRecords,
    hrSummary,
    settings,
    createEmployee,
    updateEmployee,
    updateEmployeeStatus,
    createHrPayment,
    updateHrPaymentStatus,
    upsertAttendance,
    fetchPayroll,
    createWorkGoal,
    updateWorkGoal,
  } = useContext(StoreContext);
  const { translate } = useContext(LanguageContext);
  const hrPaymentTypes = settings?.hrPaymentTypesList?.length ? settings.hrPaymentTypesList : ['Salary', 'Rent', 'Advance', 'Bonus', 'Transport', 'Other'];
  const paymentMethods = settings?.paymentMethodsList?.length ? settings.paymentMethodsList : ['Cash', 'M-Pesa', 'E-Mola', 'Card', 'Bank Transfer'];
  const attendanceStatuses = settings?.attendanceStatusesList?.length ? settings.attendanceStatusesList : ['Present', 'Absent', 'Late', 'Half Day', 'Leave'];
  const payFrequencies = settings?.payFrequenciesList?.length ? settings.payFrequenciesList : ['Monthly', 'Weekly', 'Daily', 'Hourly'];
  const hrRoles = settings?.hrRolesList?.length ? settings.hrRolesList : ['Manager', 'Cashier', 'Salesperson', 'Stock Manager', 'Production Assistant', 'Administrator'];
  const hrDepartments = settings?.hrDepartmentsList?.length ? settings.hrDepartmentsList : ['Sales', 'Store', 'Warehouse', 'Production', 'Administration', 'Finance'];

  const [activeTab, setActiveTab] = useState('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState(null);
  const [employeeForm, setEmployeeForm] = useState(initialEmployeeForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [attendanceForm, setAttendanceForm] = useState(initialAttendanceForm);
  const [goalForm, setGoalForm] = useState(initialGoalForm);
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editId, setEditId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const filteredEmployees = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((employee) =>
      `${employee.fullName} ${employee.phone || ''} ${employee.role || ''} ${employee.department || ''}`.toLowerCase().includes(query)
    );
  }, [employees, searchTerm]);

  const pendingPayments = hrPayments.filter((payment) => payment.status === 'Pending');
  const payrollPayments = payrollSheet?.payments || [];
  const monthDates = useMemo(() => {
    const [year, month] = attendanceMonth.split('-').map(Number);
    const days = new Date(year, month, 0).getDate();
    return Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      return `${attendanceMonth}-${String(day).padStart(2, '0')}`;
    });
  }, [attendanceMonth]);

  const attendanceByEmployeeDate = useMemo(() => {
    const map = new Map();
    attendanceRecords.forEach((record) => {
      map.set(`${record.employeeId}-${record.date?.slice(0, 10)}`, record);
    });
    return map;
  }, [attendanceRecords]);

  const markAttendanceQuick = async (employeeId, date, checked) => {
    const result = await upsertAttendance({
      employeeId,
      date,
      status: checked ? 'Present' : 'Absent',
      checkIn: checked ? '08:00' : '',
      checkOut: checked ? '17:00' : '',
      notes: checked ? '' : 'Marked absent from monthly grid',
    });
    setStatusMsg(result.success ? 'Attendance updated.' : '');
    setErrorMsg(result.success ? '' : result.error || 'Could not update attendance.');
  };

  const monthlySummaryFor = (employeeId) => {
    const records = monthDates
      .map((date) => attendanceByEmployeeDate.get(`${employeeId}-${date}`))
      .filter(Boolean);
    return {
      present: records.filter((record) => record.status === 'Present').length,
      absent: records.filter((record) => record.status === 'Absent').length,
      late: records.filter((record) => record.status === 'Late').length,
    };
  };

  const openEmployeeModal = (employee = null) => {
    setErrorMsg('');
    setStatusMsg('');
    if (employee) {
      setEditId(employee.id);
      setEmployeeForm({
        fullName: employee.fullName || '',
        phone: employee.phone || '',
        email: employee.email || '',
        role: employee.role || '',
        department: employee.department || '',
        performanceMode: employee.performanceMode || 'Attendance',
        salary: employee.salary || 0,
        payFrequency: employee.payFrequency || 'Monthly',
        startDate: employee.startDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        emergencyContact: employee.emergencyContact || '',
        notes: employee.notes || '',
        status: employee.status || 'Active',
      });
    } else {
      setEditId(null);
      setEmployeeForm(initialEmployeeForm);
    }
    setModal('employee');
  };

  const openGoalModal = (goal = null, employee = null) => {
    setErrorMsg('');
    setStatusMsg('');
    if (goal) {
      setEditId(goal.id);
      setGoalForm({
        employeeId: goal.employeeId || '',
        title: goal.title || '',
        description: goal.description || '',
        dueDate: goal.dueDate?.slice(0, 10) || '',
        status: goal.status || 'Pending',
        progress: goal.progress || 0,
        notes: goal.notes || '',
      });
    } else {
      setEditId(null);
      setGoalForm({ ...initialGoalForm, employeeId: employee?.id || '' });
    }
    setModal('goal');
  };

  const openPaymentModal = (employee = null) => {
    setErrorMsg('');
    setStatusMsg('');
    const employeeFrequency = paymentPeriodicities.includes(employee?.payFrequency) ? employee.payFrequency : 'One-time';
    setPaymentForm({
      ...initialPaymentForm,
      employeeId: employee?.id || '',
      description: employee ? `Salary payment - ${employee.fullName}` : '',
      amount: employee?.salary || 0,
      periodicity: employee ? employeeFrequency : 'One-time',
    });
    setModal('payment');
  };

  const openAttendanceModal = (employee = null) => {
    setErrorMsg('');
    setStatusMsg('');
    setAttendanceForm({
      ...initialAttendanceForm,
      employeeId: employee?.id || '',
    });
    setModal('attendance');
  };

  const closeModal = () => {
    setModal(null);
    setEditId(null);
    setErrorMsg('');
  };

  const saveEmployee = async (event) => {
    event.preventDefault();
    const result = editId
      ? await updateEmployee(editId, employeeForm)
      : await createEmployee(employeeForm);
    if (!result.success) {
      setErrorMsg(result.error || 'Could not save employee.');
      return;
    }
    setStatusMsg(editId ? 'Employee updated.' : 'Employee created.');
    closeModal();
  };

  const savePayment = async (event) => {
    event.preventDefault();
    const result = await createHrPayment(paymentForm);
    if (!result.success) {
      setErrorMsg(result.error || 'Could not save payment.');
      return;
    }
    setStatusMsg(paymentForm.periodicity === 'One-time' || Number(paymentForm.occurrences) <= 1 ? 'Payment recorded.' : 'Payment schedule created.');
    closeModal();
  };

  const saveAttendance = async (event) => {
    event.preventDefault();
    const result = await upsertAttendance(attendanceForm);
    if (!result.success) {
      setErrorMsg(result.error || 'Could not save attendance.');
      return;
    }
    setStatusMsg('Attendance saved.');
    closeModal();
  };

  const saveGoal = async (event) => {
    event.preventDefault();
    const result = editId
      ? await updateWorkGoal(editId, goalForm)
      : await createWorkGoal(goalForm);
    if (!result.success) {
      setErrorMsg(result.error || 'Could not save goal.');
      return;
    }
    setStatusMsg(editId ? 'Goal updated.' : 'Goal created.');
    closeModal();
  };

  const changePayrollMonth = async (month) => {
    setPayrollMonth(month);
    const result = await fetchPayroll(month);
    setErrorMsg(result.success ? '' : result.error || 'Could not load payroll.');
  };

  const toggleEmployeeStatus = async (employee) => {
    const nextStatus = employee.status === 'Active' ? 'Inactive' : 'Active';
    const result = await updateEmployeeStatus(employee.id, nextStatus);
    setStatusMsg(result.success ? `Employee marked as ${nextStatus}.` : '');
    setErrorMsg(result.success ? '' : result.error || 'Could not update employee status.');
  };

  const markPaymentPaid = async (payment) => {
    const result = await updateHrPaymentStatus(payment.id, {
      status: payment.status === 'Paid' ? 'Pending' : 'Paid',
      method: payment.method || 'Cash',
    });
    setStatusMsg(result.success ? 'Payment status updated.' : '');
    setErrorMsg(result.success ? '' : result.error || 'Could not update payment.');
  };

  const roleValues = employeeForm.role
    ? employeeForm.role.split(',').map((role) => role.trim()).filter(Boolean)
    : [];

  const toggleRole = (role) => {
    const nextRoles = roleValues.includes(role)
      ? roleValues.filter((item) => item !== role)
      : [...roleValues, role];
    setEmployeeForm({ ...employeeForm, role: nextRoles.join(', ') });
  };

  const printSalaryReceipt = (payment) => {
    const employee = payment.employee || {};
    const html = `
      <html>
        <head>
          <title>${payment.receiptNumber || 'Salary Receipt'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #2E2E2E; }
            .receipt { max-width: 720px; margin: auto; border: 1px solid #ddd5c8; padding: 28px; }
            h1 { color: #31462d; margin: 0 0 6px; }
            .muted { color: #777; }
            table { width: 100%; border-collapse: collapse; margin-top: 22px; }
            td, th { padding: 10px; border-bottom: 1px solid #eee8dd; text-align: left; }
            .total { font-size: 22px; font-weight: 700; color: #31462d; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 56px; }
            .line { border-top: 1px solid #333; padding-top: 8px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <h1>${settings?.companyName || 'Soul2Soul'}</h1>
            <div class="muted">Salary receipt / Recibo de salario</div>
            <p><strong>Receipt:</strong> ${payment.receiptNumber || '-'}</p>
            <p><strong>Month:</strong> ${payment.payrollMonth || '-'}</p>
            <table>
              <tr><th>Worker</th><td>${employee.fullName || '-'}</td></tr>
              <tr><th>Role</th><td>${employee.role || '-'}</td></tr>
              <tr><th>Department</th><td>${employee.department || '-'}</td></tr>
              <tr><th>Status</th><td>${payment.status}</td></tr>
              <tr><th>Paid date</th><td>${payment.paidDate ? formatDate(payment.paidDate) : '-'}</td></tr>
              <tr><th>Method</th><td>${payment.method || '-'}</td></tr>
              <tr><th>Amount</th><td class="total">${formatCurrency(payment.amount, settings)}</td></tr>
            </table>
            <div class="signatures">
              <div class="line">Company signature</div>
              <div class="line">Worker signature</div>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>`;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>{translate('humanResources')}</h1>
          <p className="page-subtitle">{translate('hrSubtitle')}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => openPaymentModal()}>
            <Plus size={18} /> {translate('addPayment')}
          </button>
          <button className="btn btn-primary" onClick={() => openEmployeeModal()}>
            <Plus size={18} /> {translate('addWorker')}
          </button>
        </div>
      </div>

      {statusMsg && <div className="inline-alert inline-alert-success"><CheckCircle2 size={18} /> {statusMsg}</div>}
      {errorMsg && <div className="inline-alert inline-alert-danger">{errorMsg}</div>}

      <div className="stats-grid hr-stats-grid">
        <div className="stat-card">
          <div className="stat-label">{translate('activeWorkers')}</div>
          <div className="stat-value">{hrSummary?.activeEmployees || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{translate('monthlyPayroll')}</div>
          <div className="stat-value">{formatCurrency(hrSummary?.monthlyPayroll || 0, settings)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{translate('pendingPayments')}</div>
          <div className="stat-value">{formatCurrency(hrSummary?.pendingPayments || 0, settings)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{translate('openGoals')}</div>
          <div className="stat-value">{hrSummary?.openGoals || 0}</div>
        </div>
      </div>

      <div className="hr-tabs">
        <button className={activeTab === 'employees' ? 'active' : ''} onClick={() => setActiveTab('employees')}>{translate('workers')}</button>
        <button className={activeTab === 'payroll' ? 'active' : ''} onClick={() => setActiveTab('payroll')}>{translate('payrollSheet')}</button>
        <button className={activeTab === 'payments' ? 'active' : ''} onClick={() => setActiveTab('payments')}>{translate('payments')}</button>
        <button className={activeTab === 'attendance' ? 'active' : ''} onClick={() => setActiveTab('attendance')}>{translate('attendance')}</button>
        <button className={activeTab === 'goals' ? 'active' : ''} onClick={() => setActiveTab('goals')}>{translate('goalsDeadlines')}</button>
      </div>

      {activeTab === 'employees' && (
        <div className="card">
          <div className="search-input">
            <Search size={18} />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search worker, phone, role, or department..." />
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <strong>{employee.fullName}</strong>
                      <span className="table-muted">{employee.department || 'General'}</span>
                    </td>
                    <td>{employee.role || '-'}</td>
                    <td>{employee.phone || '-'}</td>
                    <td>{formatCurrency(employee.salary, settings)} <span className="table-muted">{employee.payFrequency}</span></td>
                    <td><span className={`badge ${employee.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{employee.status}</span></td>
                    <td>
                      <div className="row-actions">
                        {employee.phone && (
                          <a className="btn btn-ghost compact-btn" href={whatsappHref(employee.phone, `Bom dia ${employee.fullName}, mensagem da Soul to Soul.`)} target="_blank" rel="noreferrer" title="Send WhatsApp">
                            <MessageCircle size={16} />
                          </a>
                        )}
                        <button className="btn btn-ghost compact-btn" onClick={() => openAttendanceModal(employee)} title="Mark attendance">A</button>
                        <button className="btn btn-ghost compact-btn" onClick={() => openGoalModal(null, employee)} title="Add goal"><Target size={16} /></button>
                        <button className="btn btn-ghost compact-btn" onClick={() => openPaymentModal(employee)} title="Add payment">MT</button>
                        <button className="btn btn-ghost compact-btn" onClick={() => openEmployeeModal(employee)} title="Edit worker"><Edit size={16} /></button>
                        <button className="btn btn-ghost compact-btn" onClick={() => toggleEmployeeStatus(employee)} title="Change status">
                          {employee.status === 'Active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No workers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="card">
          <div className="section-heading">
            <div>
              <h3>{translate('payrollSheet')}</h3>
              <span>{translate('payrollHint')}</span>
            </div>
            <div className="row-actions">
              <input className="form-input toolbar-select" type="month" value={payrollMonth} onChange={(event) => changePayrollMonth(event.target.value)} />
              <button className="btn btn-secondary" type="button" onClick={() => window.print()}><Printer size={18} /> {translate('print')}</button>
            </div>
          </div>
          <div className="payroll-summary-grid">
            <div><span>{translate('totalPayroll')}</span><strong>{formatCurrency(payrollSheet?.totals?.gross || 0, settings)}</strong></div>
            <div><span>{translate('paid')}</span><strong>{formatCurrency(payrollSheet?.totals?.paid || 0, settings)}</strong></div>
            <div><span>{translate('pending')}</span><strong>{formatCurrency(payrollSheet?.totals?.pending || 0, settings)}</strong></div>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>{translate('worker')}</th><th>{translate('role')}</th><th>{translate('department')}</th><th>{translate('amount')}</th><th>{translate('status')}</th><th>{translate('receipt')}</th><th>{translate('action')}</th></tr></thead>
              <tbody>
                {payrollPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td><strong>{payment.employee?.fullName || '-'}</strong><span className="table-muted">{payment.receiptNumber || '-'}</span></td>
                    <td>{payment.employee?.role || '-'}</td>
                    <td>{payment.employee?.department || '-'}</td>
                    <td>{formatCurrency(payment.amount, settings)}</td>
                    <td><span className={`badge ${payment.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>{payment.status}</span></td>
                    <td><button className="btn btn-ghost compact-btn" onClick={() => printSalaryReceipt(payment)}><FileText size={16} /></button></td>
                    <td><button className="btn btn-ghost compact-btn" onClick={() => markPaymentPaid(payment)}>{payment.status === 'Paid' ? translate('reopen') : translate('markPaid')}</button></td>
                  </tr>
                ))}
                {payrollPayments.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>{translate('noPayroll')}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="card">
          <div className="section-heading">
            <h3>Payments</h3>
            <span>{pendingPayments.length} pending</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Worker</th>
                  <th>Due</th>
                  <th>Periodicity</th>
                  <th>Next Due</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {hrPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.description}</td>
                    <td><span className="badge badge-primary">{payment.type}</span></td>
                    <td>{payment.employee?.fullName || '-'}</td>
                    <td>{formatDate(payment.dueDate)}</td>
                    <td>{payment.periodicity || 'One-time'}</td>
                    <td>{formatDate(payment.nextDueDate)}</td>
                    <td>{formatCurrency(payment.amount, settings)}</td>
                    <td><span className={`badge ${payment.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>{payment.status}</span></td>
                    <td>
                      <button className="btn btn-ghost compact-btn" onClick={() => markPaymentPaid(payment)}>
                        {payment.status === 'Paid' ? 'Reopen' : 'Mark Paid'}
                      </button>
                    </td>
                  </tr>
                ))}
                {hrPayments.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>No payments recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="card">
          <div className="section-heading">
            <div>
              <h3>Attendance</h3>
              <span>Monthly checkbox grid for fast daily marking.</span>
            </div>
            <div className="row-actions">
              <input className="form-input toolbar-select" type="month" value={attendanceMonth} onChange={(event) => setAttendanceMonth(event.target.value)} />
              <button className="btn btn-primary" onClick={() => openAttendanceModal()}><Plus size={18} /> Detailed Mark</button>
            </div>
          </div>
          <div className="attendance-grid-wrap">
            <table className="attendance-grid">
              <thead>
                <tr>
                  <th>Worker</th>
                  {monthDates.map((date) => <th key={date}>{Number(date.slice(-2))}</th>)}
                  <th>P</th>
                  <th>A</th>
                  <th>L</th>
                </tr>
              </thead>
              <tbody>
                {employees.filter((employee) => employee.performanceMode !== 'Goals').map((employee) => {
                  const summary = monthlySummaryFor(employee.id);
                  return (
                    <tr key={employee.id}>
                      <td><strong>{employee.fullName}</strong><span className="table-muted">{employee.role || employee.department || '-'}</span></td>
                      {monthDates.map((date) => {
                        const record = attendanceByEmployeeDate.get(`${employee.id}-${date}`);
                        const isPresent = record?.status === 'Present';
                        return (
                          <td key={date} className={record?.status === 'Late' ? 'attendance-late' : record?.status === 'Absent' ? 'attendance-absent' : ''}>
                            <input
                              type="checkbox"
                              checked={isPresent}
                              title={record?.status || 'Not marked'}
                              onChange={(event) => markAttendanceQuick(employee.id, date, event.target.checked)}
                            />
                          </td>
                        );
                      })}
                      <td>{summary.present}</td>
                      <td>{summary.absent}</td>
                      <td>{summary.late}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <div className="section-heading">
              <h3>Detailed Records</h3>
              <span>Absences, late marks, notes and check-in/out details.</span>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Worker</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td>{record.employee?.fullName || '-'}</td>
                    <td><span className="badge badge-primary">{record.status}</span></td>
                    <td>{record.checkIn || '-'}</td>
                    <td>{record.checkOut || '-'}</td>
                    <td>{record.notes || '-'}</td>
                  </tr>
                ))}
                {attendanceRecords.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No attendance records yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="card">
          <div className="section-heading">
            <div>
              <h3>{translate('goalsDeadlines')}</h3>
              <span>{translate('goalsHint')}</span>
            </div>
            <button className="btn btn-primary" onClick={() => openGoalModal()}><Plus size={18} /> {translate('addGoal')}</button>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>{translate('worker')}</th><th>{translate('goal')}</th><th>{translate('deadline')}</th><th>{translate('progress')}</th><th>{translate('status')}</th><th>{translate('action')}</th></tr></thead>
              <tbody>
                {workGoals.map((goal) => (
                  <tr key={goal.id}>
                    <td>{goal.employee?.fullName || '-'}</td>
                    <td><strong>{goal.title}</strong><span className="table-muted">{goal.description || goal.notes || '-'}</span></td>
                    <td>{formatDate(goal.dueDate)}</td>
                    <td>{goal.progress || 0}%</td>
                    <td><span className={`badge ${goal.status === 'Completed' ? 'badge-success' : goal.status === 'Missed' ? 'badge-danger' : 'badge-warning'}`}>{goal.status}</span></td>
                    <td><button className="btn btn-ghost compact-btn" onClick={() => openGoalModal(goal)}><Edit size={16} /></button></td>
                  </tr>
                ))}
                {workGoals.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>{translate('noGoals')}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal === 'employee' && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>{editId ? translate('editWorker') : translate('addWorker')}</h2>
                <p>Keep the HR profile simple and practical.</p>
              </div>
              <button className="icon-button" onClick={closeModal}><X size={20} /></button>
            </div>
            {errorMsg && <div className="inline-alert inline-alert-danger">{errorMsg}</div>}
            <form onSubmit={saveEmployee}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" required value={employeeForm.fullName} onChange={(event) => setEmployeeForm({ ...employeeForm, fullName: event.target.value })} />
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Phone / WhatsApp</label>
                  <input className="form-input" value={employeeForm.phone} onChange={(event) => setEmployeeForm({ ...employeeForm, phone: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={employeeForm.email} onChange={(event) => setEmployeeForm({ ...employeeForm, email: event.target.value })} />
                </div>
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">{translate('role')}</label>
                  <div className="multi-option-list">
                    {hrRoles.map((role) => (
                      <label key={role} className="multi-option-pill">
                        <input type="checkbox" checked={roleValues.includes(role)} onChange={() => toggleRole(role)} />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{translate('department')}</label>
                  <select className="form-input" value={employeeForm.department} onChange={(event) => setEmployeeForm({ ...employeeForm, department: event.target.value })}>
                    <option value="">Select department</option>
                    {hrDepartments.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{translate('controlMode')}</label>
                <select className="form-input" value={employeeForm.performanceMode} onChange={(event) => setEmployeeForm({ ...employeeForm, performanceMode: event.target.value })}>
                  <option value="Attendance">{translate('attendanceControlled')}</option>
                  <option value="Goals">{translate('goalsControlled')}</option>
                </select>
                <small className="field-help">{translate('controlModeHint')}</small>
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Salary</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={employeeForm.salary} onChange={(event) => setEmployeeForm({ ...employeeForm, salary: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pay Frequency</label>
                  <select className="form-input" value={employeeForm.payFrequency} onChange={(event) => setEmployeeForm({ ...employeeForm, payFrequency: event.target.value })}>
                    {payFrequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
                  </select>
                </div>
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" className="form-input" value={employeeForm.startDate} onChange={(event) => setEmployeeForm({ ...employeeForm, startDate: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={employeeForm.status} onChange={(event) => setEmployeeForm({ ...employeeForm, status: event.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Contact</label>
                <input className="form-input" value={employeeForm.emergencyContact} onChange={(event) => setEmployeeForm({ ...employeeForm, emergencyContact: event.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows="3" value={employeeForm.notes} onChange={(event) => setEmployeeForm({ ...employeeForm, notes: event.target.value })}></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Save Changes' : 'Create Worker'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'goal' && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>{editId ? translate('editGoal') : translate('addGoal')}</h2>
                <p>{translate('goalModalHint')}</p>
              </div>
              <button className="icon-button" onClick={closeModal}><X size={20} /></button>
            </div>
            {errorMsg && <div className="inline-alert inline-alert-danger">{errorMsg}</div>}
            <form onSubmit={saveGoal}>
              <div className="form-group">
                <label className="form-label">{translate('worker')} *</label>
                <select className="form-input" required value={goalForm.employeeId} onChange={(event) => setGoalForm({ ...goalForm, employeeId: event.target.value })}>
                  <option value="">{translate('selectWorker')}</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{translate('goal')} *</label>
                <input className="form-input" required value={goalForm.title} onChange={(event) => setGoalForm({ ...goalForm, title: event.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{translate('description')}</label>
                <textarea className="form-input" rows="3" value={goalForm.description} onChange={(event) => setGoalForm({ ...goalForm, description: event.target.value })}></textarea>
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">{translate('deadline')}</label>
                  <input type="date" className="form-input" value={goalForm.dueDate} onChange={(event) => setGoalForm({ ...goalForm, dueDate: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{translate('status')}</label>
                  <select className="form-input" value={goalForm.status} onChange={(event) => setGoalForm({ ...goalForm, status: event.target.value })}>
                    {goalStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{translate('progress')}</label>
                <input type="number" min="0" max="100" className="form-input" value={goalForm.progress} onChange={(event) => setGoalForm({ ...goalForm, progress: event.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{translate('notes')}</label>
                <textarea className="form-input" rows="3" value={goalForm.notes} onChange={(event) => setGoalForm({ ...goalForm, notes: event.target.value })}></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>{translate('cancel')}</button>
                <button type="submit" className="btn btn-primary">{translate('saveChanges')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'payment' && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>Add Payment</h2>
                <p>Use this for salaries, rent, advances, bonuses, or other operational payments.</p>
              </div>
              <button className="icon-button" onClick={closeModal}><X size={20} /></button>
            </div>
            {errorMsg && <div className="inline-alert inline-alert-danger">{errorMsg}</div>}
            <form onSubmit={savePayment}>
              <div className="form-group">
                <label className="form-label">Worker (optional)</label>
                <select className="form-input" value={paymentForm.employeeId} onChange={(event) => setPaymentForm({ ...paymentForm, employeeId: event.target.value })}>
                  <option value="">General business payment</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
                </select>
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={paymentForm.type} onChange={(event) => setPaymentForm({ ...paymentForm, type: event.target.value })}>
                    {hrPaymentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <input className="form-input" required value={paymentForm.description} onChange={(event) => setPaymentForm({ ...paymentForm, description: event.target.value })} />
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={paymentForm.dueDate} onChange={(event) => setPaymentForm({ ...paymentForm, dueDate: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={paymentForm.status} onChange={(event) => setPaymentForm({ ...paymentForm, status: event.target.value })}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Periodicity</label>
                  <select
                    className="form-input"
                    value={paymentForm.periodicity}
                    onChange={(event) => setPaymentForm({
                      ...paymentForm,
                      periodicity: event.target.value,
                      occurrences: event.target.value === 'One-time' ? 1 : paymentForm.occurrences,
                    })}
                  >
                    {paymentPeriodicities.map((periodicity) => <option key={periodicity} value={periodicity}>{periodicity}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Occurrences</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    className="form-input"
                    value={paymentForm.occurrences}
                    disabled={paymentForm.periodicity === 'One-time'}
                    onChange={(event) => setPaymentForm({ ...paymentForm, occurrences: event.target.value })}
                  />
                </div>
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Period Start</label>
                  <input type="date" className="form-input" value={paymentForm.periodStart} onChange={(event) => setPaymentForm({ ...paymentForm, periodStart: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Period End</label>
                  <input type="date" className="form-input" value={paymentForm.periodEnd} onChange={(event) => setPaymentForm({ ...paymentForm, periodEnd: event.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Method</label>
                <select className="form-input" value={paymentForm.method} onChange={(event) => setPaymentForm({ ...paymentForm, method: event.target.value })}>
                  <option value="">Select payment method</option>
                  {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows="3" value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })}></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'attendance' && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>Mark Attendance</h2>
                <p>One simple record per worker per day.</p>
              </div>
              <button className="icon-button" onClick={closeModal}><X size={20} /></button>
            </div>
            {errorMsg && <div className="inline-alert inline-alert-danger">{errorMsg}</div>}
            <form onSubmit={saveAttendance}>
              <div className="form-group">
                <label className="form-label">Worker *</label>
                <select className="form-input" required value={attendanceForm.employeeId} onChange={(event) => setAttendanceForm({ ...attendanceForm, employeeId: event.target.value })}>
                  <option value="">Select worker</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
                </select>
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={attendanceForm.date} onChange={(event) => setAttendanceForm({ ...attendanceForm, date: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={attendanceForm.status} onChange={(event) => setAttendanceForm({ ...attendanceForm, status: event.target.value })}>
                    {attendanceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Check In</label>
                  <input type="time" className="form-input" value={attendanceForm.checkIn} onChange={(event) => setAttendanceForm({ ...attendanceForm, checkIn: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Check Out</label>
                  <input type="time" className="form-input" value={attendanceForm.checkOut} onChange={(event) => setAttendanceForm({ ...attendanceForm, checkOut: event.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows="3" value={attendanceForm.notes} onChange={(event) => setAttendanceForm({ ...attendanceForm, notes: event.target.value })}></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Attendance</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Download, Search, Calendar, DollarSign, TrendingUp, ArrowLeft, FileText, Plus, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAllPayRolls, getSinglePayRoll } from "@/services/Service";
import { useToast } from '@/hooks/use-toast';
import GeneratePayslipDialog from "@/Forms/GeneratePayslipDialog";
import SalarySlipCard from '@/components/cards/SalarySlipCard';
import { months } from "@/services/allFunctions";
import { Helmet } from "react-helmet-async";
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/hooks/hook';
import { getPayroll, getSinglePayroll } from '@/redux-toolkit/slice/allPage/payrollSlice';
import { socket } from "@/socket/socket";

const today = new Date();
const todayYear = today.getFullYear();

const Payroll: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [salarySlipRefresh, setSalarySlipRefresh] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  // const [allPayrolls, setAllPayrolls] = useState<any[]>([]);
  // const [singlePayrolls, setSinglePayrolls] = useState<any[]>([]);
  const [pdfData, setPdfData] = useState<any>(null);
  const [pdfOpenForm, setPdfOpenForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const dispatch = useAppDispatch();
  const allPayrolls = useAppSelector((state) => state.payroll.allPayRoll);
  const singlePayrolls = useAppSelector((state) => state.payroll.singlePayRoll);
  const isEmployee = user?.role === 'employee';

  // Determine source array based on role
  const sourcePayrolls = isEmployee ? singlePayrolls : allPayrolls;

  let filteredPayrolls = sourcePayrolls?.filter((p) => {
    // 🔍 Search filter (admin ke liye useful)
    const matchSearch = p?.employeeId?.fullName
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());

    // 📅 Month-Year filter
    const matchDate =
      selectedMonth && selectedYear
        ? p.month === months[selectedMonth - 1].toLowerCase() && p.year === selectedYear
        : true;
    return matchSearch && matchDate;
  });



  const stats = useMemo(() => {
    if (!allPayrolls || allPayrolls.length === 0) {
      return { totalPayroll: 0, avgSalary: 0, employees: 0 };
    }

    const totalPayroll = allPayrolls.reduce(
      (sum, p) => sum + (p.basic + p.allowance - p.deductions),
      0
    );

    const avgSalary = Math.round(totalPayroll / allPayrolls.length);
    // Count unique employees
    const uniqueEmployees = new Set(allPayrolls.map(p => p.employeeId._id));

    return {
      totalPayroll,
      avgSalary,
      employees: uniqueEmployees.size,
    };
  }, [allPayrolls]);

   useEffect(() => {
                socket.on("getPayrollRefresh", () => {
                    console.log("getPayrollRefresh");
                    handleGetAllPayRolls();
                    handleGetSinglePayRoll();
                });
        
                return () => {
                    socket.off("getPayrollRefresh");
                };
            }, []);


  const handleGetAllPayRolls = async () => {
    setPageLoading(true);
    try {
      const data = await getAllPayRolls(user?.companyId?._id);
      if (Array.isArray(data)) {
        // setAllPayrolls(data);
        dispatch(getPayroll(data));
        setSalarySlipRefresh(false);
      }
    } catch (error) {
      console.error("Error fetching all payrolls:", error);
    }
    finally {
      setPageLoading(false);
    }
  };

  const handleGetSinglePayRoll = async () => {
    setPageLoading(true);
    try {
      const data = await getSinglePayRoll(user?._id, user?.createdBy?._id);
      if (Array.isArray(data)) {
        // setSinglePayrolls(data);
        dispatch(getSinglePayroll(data));
        setSalarySlipRefresh(false);
      }
    } catch (error) {
      console.error("Error fetching all payrolls:", error);
    }
    finally {
      setPageLoading(false);
    }
  };
  useEffect(() => {
    if (user?.role === "admin" && (allPayrolls?.length === 0 || salarySlipRefresh)) {
      handleGetAllPayRolls();
    }
  }, [allPayrolls.length, salarySlipRefresh, user?.role])

  useEffect(() => {
    if (!user) return; // agar user null ho to kuch na kare

    if (user.role === 'employee' && (singlePayrolls.length === 0 || salarySlipRefresh)) {
      handleGetSinglePayRoll();
    }
  }, [user, salarySlipRefresh, singlePayrolls.length]);


  if (pageLoading && (allPayrolls.length === 0 || singlePayrolls.length === 0)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
      </div>
    );
  }


  return (
    <>
      <Helmet>
        <title>Payroll Page</title>
        <meta name="description" content="This is the home page of our app" />
      </Helmet>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end md:mt-[-15px] gap-4">
          {/* Right side: button */}
          {!isEmployee && (
            <Button onClick={() => { setInitialData(null); setIsDialogOpen(true) }}>
              <Plus className="w-4 h-4 mr-2" />
              Generate Payslip
            </Button>
          )}
        </div>

        {pdfOpenForm && <SalarySlipCard data={pdfData} onClose={() => setPdfOpenForm(false)} />}
        <GeneratePayslipDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} setSalarySlipRefresh={setSalarySlipRefresh} initialData={initialData} />

        {/* Stats (Admin/Super Admin only) */}
        {!isEmployee && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <IndianRupee className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Payroll</p>
                    <p className="text-xl font-bold">₹{stats.totalPayroll.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Salary</p>
                    <p className="text-xl font-bold">₹{stats.avgSalary.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <FileText className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employees</p>
                    <p className="text-xl font-bold">{stats.employees}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Employee Salary Slips */}
        {isEmployee && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                {/* Left side: Icon + Title */}
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>My Salary Slips</span>
                </div>

                {/* Right side: Date input */}
                <input
                  type="month"
                  value={selectedYear && selectedMonth ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}` : ''}
                  onChange={(e) => {
                    if (!e.target.value) {
                      setSelectedMonth(null);
                      setSelectedYear(null);
                      return;
                    }
                    const [year, month] = e.target.value.split('-');
                    setSelectedMonth(Number(month));
                    setSelectedYear(Number(year));
                  }}
                  className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Basic</TableHead>
                      <TableHead className="text-right">Allowances</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Salary</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayrolls && filteredPayrolls.length > 0 ? (
                      filteredPayrolls.map((slip) => (
                        <TableRow key={slip._id}>
                          <TableCell className="font-medium">
                            {slip.month} {slip.year}
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{slip.basic.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-success">
                            +₹{slip.allowance.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            -₹{slip.deductions.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            ₹{(slip.basic + slip.allowance - slip.deductions).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPdfOpenForm(true);
                                setPdfData(slip);
                              }}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-6 text-muted-foreground"
                        >
                          No payroll data found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Payroll Table */}
        {!isEmployee && (
          <>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-4">
                  {/* Left side */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span>
                      {months[today.getMonth()]} {todayYear} Payroll
                    </span>
                  </div>

                  {/* Right side */}
                  <input
                    type="month"
                    value={selectedYear && selectedMonth ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}` : ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setSelectedMonth(null);
                        setSelectedYear(null);
                        return;
                      }
                      const [year, month] = e.target.value.split('-');
                      setSelectedMonth(Number(month));
                      setSelectedYear(Number(year));
                    }}
                    className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />

                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Basic</TableHead>
                        <TableHead className="text-right">Allowances</TableHead>
                        <TableHead className="text-right">Deductions</TableHead>
                        <TableHead className="text-right">Net Salary</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayrolls && filteredPayrolls.length > 0 ? (
                        filteredPayrolls.map((employee) => (
                          <TableRow key={employee._id}>
                            <TableCell className="font-medium">
                              {employee.employeeId.fullName}
                            </TableCell>
                            <TableCell>{employee?.departmentId?.name}</TableCell>
                            <TableCell className="text-right">
                              ₹{employee.basic.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-success">
                              +₹{employee.allowance.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-destructive">
                              -₹{employee.deductions.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              ₹
                              {(employee.basic +
                                employee.allowance -
                                employee.deductions).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPdfOpenForm(true);
                                  setPdfData(employee);
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-6 text-muted-foreground"
                          >
                            No payroll data found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>

                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
};

export default Payroll;

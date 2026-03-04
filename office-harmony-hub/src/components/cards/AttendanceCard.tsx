

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { getAttendanceData, getEmployees } from "@/services/Service";
import { AttendanceItem, Props, months } from "@/types/index";
import { getStatusStyle, getMonthlySummary } from "@/services/allFunctions";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getAttendance } from "@/redux-toolkit/slice/allPage/attendanceSlice";
import { getEmployeeList } from "@/redux-toolkit/slice/allPage/userSlice";
import { getAttendancePayroll } from "@/redux-toolkit/slice/allPage/payrollSlice";
import { socket } from "@/socket/socket";

const AttendanceTable: React.FC<Props> = ({ attendanceRefresh, setAttendanceRefresh }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const daysInMonth = 31;

  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();
  const isCurrentMonth = todayMonth === new Date().getMonth() && todayYear === new Date().getFullYear();
  const getTodayDate = () => today.toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const { notifications } = useNotifications();
  const [pageLoading, setPageLoading] = useState(false);

  const dispatch = useAppDispatch();
  const attendanceList = useAppSelector((state) => state.attendance.attendance);
  const employeeList = useAppSelector((state) => state.user.employees);
  const payrollList = useAppSelector((state) => state.payroll?.attendancePayRoll);

  useEffect(() => {
    socket.on("getAttendanceRefresh", () => {
      handleGetEmployees();
      fetchAttendances(selectedDate);
    });
    socket.on("getEmployeeRefresh", () => {
      handleGetEmployees();
    });
    socket.on("getPayrollRefresh", () => {
      handleGetEmployees();
      fetchAttendances(selectedDate);
    });

    return () => {
      socket.off("getAttendanceRefresh");
      socket.off("getEmployeeRefresh");
      socket.off("getPayrollRefresh");
    };
  }, []);


  // =================== Fetch Employees ===================
  const handleGetEmployees = async () => {
    try {
      setPageLoading(true);
      const data = await getEmployees(user?.companyId?._id);
      if (Array.isArray(data)) dispatch(getEmployeeList(data));
    } catch (err: any) {
      console.log(err);
    }
    finally {
      setPageLoading(false);
    }
  };
  useEffect(() => {
    if (
      (user?.role === "admin" || user?.taskRole === "manager") && employeeList.length === 0) {
      handleGetEmployees();
    }
  }, [user?.role, user?.taskRole, employeeList.length]);


  // ================= Fetch Attendance =================
  const fetchAttendances = async (date: string) => {
    try {
      const selected = new Date(date);

      const month = selected.getMonth() + 1; // JS months = 0–11
      const year = selected.getFullYear();
      const companyId = user?.role === "employee" ? user?.createdBy?._id : user?.companyId?._id;
      if (!month || !year || !companyId) return;
      setPageLoading(true);
      const res = await getAttendanceData(month, year, companyId);

      if (Array.isArray(res?.data?.records)) {
        dispatch(getAttendance(res.data?.records || []));
        setAttendanceRefresh(false)
      }

      if (Array.isArray(res?.data?.payrolls)) {
        // setPayrollList(res.data.payrolls);
        dispatch(getAttendancePayroll(res.data.payrolls));
      }
    } catch (err: any) {
      console.log(err);
      toast({
        title: "Error",
        description:
          err?.response?.data?.error || "Something went wrong",
      });
    }
    finally {
      setPageLoading(false);
    }

  };
  const lastNotificationCount = useRef(notifications?.length || 0);

  useEffect(() => {
    if (!user?._id) return;
    console.log(attendanceRefresh)
    let shouldFetch = attendanceList.length === 0 || payrollList.length === 0 || attendanceRefresh || (notifications?.length > lastNotificationCount.current);
    if (shouldFetch) {
      fetchAttendances(selectedDate);
      // update last seen notifications count
      lastNotificationCount.current = notifications?.length || 0;
    }
  }, [user?._id, selectedDate, attendanceRefresh, attendanceList.length, payrollList.length, notifications?.length]);

  // ================= Process Attendance =================
  const attendanceMap = useMemo(() => {
    const map: Record<string, { name: string; profilePic: string; attendanceByDate: Record<number, any> }> = {};

    // Filter: employee sees only own data
    const filteredList =
      user?.role === "employee"
        ? attendanceList?.filter(att => att?.userId?._id === user?._id)
        : attendanceList;

    filteredList.forEach((item) => {
      const userId = item?.userId?._id;
      const day = new Date(item.date).getDate();

      if (!map[userId]) {
        map[userId] = {
          name: item?.userId?.fullName,
          profilePic: item?.userId?.profileImage,
          attendanceByDate: {},
        };
      }

      map[userId].attendanceByDate[day] = {
        status: item.status,
        clockIn: item.clockIn,
        clockOut: item.clockOut,
        hours: item.hoursWorked,
      };
    });

    return map;
  }, [attendanceList, user]);

  // const users = useMemo(
  //   () => Object.keys(attendanceMap).map(id => ({ _id: id, ...attendanceMap[id] })),
  //   [attendanceMap]
  // );


  const users = useMemo(() => {
    if (user?.role === "employee") {
      return [{
        _id: user._id,
        name: user.fullName,
        profilePic: user.profileImage,
        attendanceByDate: attendanceMap[user._id]?.attendanceByDate || {},
      }];
    }

    if (!employeeList?.length) return [];

    return employeeList.map((emp) => {
      const attendanceData = attendanceMap[emp._id];

      return {
        _id: emp._id,
        name: emp.fullName,
        profilePic: emp.profileImage,
        attendanceByDate: attendanceData?.attendanceByDate || {},
      };
    });
  }, [employeeList, attendanceMap, user]);




  const payrollMap = useMemo(() => {
    const map: Record<string, any> = {};
    payrollList.forEach(p => {
      map[p.employeeId] = p;
    });
    return map;
  }, [payrollList]);


  // const calculateSalaryAfterCut = (userId: string) => {
  //   const payroll = payrollMap[userId];
  //   let totalSalary = 0;
  //   let cutAmount = 0;
  //   let finalSalary = 0;
  //   if (!payroll) {
  //     totalSalary = Number(employeeList.find((e) => e?._id === userId)?.monthSalary || 0);
  //     return {
  //       totalSalary,
  //       cutAmount,
  //       finalSalary,
  //     };
  //   }
  //   else {
  //     const summary = getMonthlySummary(userId, attendanceMap);

  //     totalSalary =
  //       Number(payroll.basic || 0) +
  //       Number(payroll.allowance || 0) -
  //       Number(payroll.deductions || 0);

  //     const totalWorkingDays = 30; // fixed (ya dynamic kar sakte ho)
  //     const perDaySalary = totalSalary / totalWorkingDays;

  //     const absentDays =
  //       summary.absent +
  //       summary.halfDay * 0.5;

  //     const cutAmount = perDaySalary * absentDays;
  //     const finalSalary = Math.max(totalSalary - cutAmount, 0);

  //     return {
  //       totalSalary,
  //       cutAmount,
  //       finalSalary,
  //     };
  //   }
  // };

  const calculateSalaryAfterCut = (userId: string) => {
    const payroll = payrollMap[userId];
    const summary = getMonthlySummary(userId, attendanceMap);

    // 1️⃣ Total Salary Calculate
    let totalSalary = 0;

    if (!payroll) {
      totalSalary = Number(
        employeeList.find(e => e._id === userId)?.monthSalary || 0
      );
    } else {
      totalSalary =
        Number(payroll.basic || 0) +
        Number(payroll.allowance || 0);
    }

    // 2️⃣ Set Total Working Days (IMPORTANT)
    // Yaha aap 30 ya 26 rakh sakte ho company rule ke hisaab se
    let totalWorkingDays = 30;

    // Safety check
    if (totalWorkingDays === 0) {
      return { totalSalary: 0, cutAmount: 0, finalSalary: 0 };
    }

    // 3️⃣ Per Day Salary
    const perDaySalary = totalSalary / totalWorkingDays;

    // 4️⃣ Absent Days Calculation
    const absentDays =
      Number(summary?.absent || 0) +
      0.5 * Number(summary?.halfDay || 0);

    // 5️⃣ Cut Amount
    const cutAmount = perDaySalary * absentDays;

    // 6️⃣ Final Salary (Never Negative)
    const finalSalary = Math.max(totalSalary - cutAmount, 0);

    return {
      totalSalary: Number(totalSalary.toFixed(2)),
      cutAmount: Number(cutAmount.toFixed(2)),
      finalSalary: Number(finalSalary.toFixed(2)),
    };
  };


  if (pageLoading && (!employeeList?.length || !attendanceList.length || !payrollList.length)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
      </div>
    );
  }

  // ================= Render =================
  return (
    <Card className="overflow-hidden shadow-sm relative">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            {months[today.getMonth()]} {todayYear} Attendance
          </div>
          <div className="flex items-center gap-3">
            <input type="month" value={selectedDate} onChange={(e) => {
              const date = e.target.value;
              setSelectedDate(date);
              fetchAttendances(date);
            }} className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 relative" style={{ minHeight: "450px" }}>
        <div className="absolute inset-0 overflow-x-auto overflow-y-auto">
          <table className="table-auto border-separate border-spacing-0 min-w-max">
            <thead className="sticky top-0 z-20 bg-muted/80 backdrop-blur-sm">
              <tr>
                <th className="sticky left-0 z-30 bg-muted/80 border-r px-5 py-4 text-left font-semibold min-w-[240px]">
                  Employee
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const isToday = isCurrentMonth && day === todayDate;
                  return (
                    <th key={day} className={cn("text-center px-4 py-4 font-medium min-w-[100px] border-b", isToday && "bg-primary text-white")}>
                      {day}
                      {isToday && <div className="text-[10px] font-semibold">Today</div>}
                    </th>
                  );
                })}
                <th className="text-center px-4 py-4 font-medium min-w-[120px] border-l border-b bg-muted/80">Summary</th>
              </tr>
            </thead>

            <tbody>
              {users.map((emp) => {
                const summary = getMonthlySummary(emp._id, attendanceMap);
                return (
                  <tr key={emp._id} className="hover:bg-muted/30">
                    <td className="sticky left-0 z-10 bg-white border-r px-5 py-4 font-medium min-w-[240px] shadow-md">
                      <div className="flex items-center gap-3">
                        <img src={emp.profilePic} alt={emp.name} className="w-9 h-9 rounded-full object-cover border" />
                        <span className="text-sm">{emp.name}</span>
                      </div>
                    </td>

                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const isToday = isCurrentMonth && day === todayDate;
                      const data = emp.attendanceByDate[day] || { status: "No Data", clockIn: "-", clockOut: "-", hours: 0 };
                      const displayValue = data.message || data.status; // ✅ message > status
                      const { bg, text } = getStatusStyle(displayValue);

                      return (
                        <td key={`${emp._id}-${day}`} className={cn("text-center px-3 py-4 border-b text-xs min-w-[100px]", bg, isToday && "ring-2 ring-primary ring-inset")}>
                          <div className="font-semibold mb-1">{text}</div>
                          {!data?.message && <>
                            <div className="text-[10px] opacity-80">{data.clockIn} - {data.clockOut}</div>
                            <div className="text-[10px] font-medium">{data.hours > 0 ? `${data.hours.toFixed(1)}h` : "-"}</div>
                          </>}
                        </td>
                      );
                    })}

                    <td className="text-center px-3 py-4 border-b border-l text-xs min-w-[120px] bg-gray-50">
                      <div className="font-semibold text-green-700">P: {summary.present}</div>
                      <div className="font-semibold text-red-700">A: {summary.absent}</div>
                      {summary.halfDay > 0 && <div className="font-semibold text-yellow-700">H: {summary.halfDay}</div>}
                      {summary.late > 0 && <div className="font-semibold text-orange-700">L: {summary.late}</div>}
                      {user?.role === "admin" ? (() => {
                        const salary = calculateSalaryAfterCut(emp._id);
                        if (!salary) return null;

                        return (
                          <div className="mt-2 text-[10px] text-muted-foreground">
                            <div>Total Salary: ₹{salary?.totalSalary?.toFixed(0)}</div>
                            <div className="text-red-600">Cut: -₹{salary?.cutAmount?.toFixed(0)}</div>
                            <div className="font-semibold text-green-700">
                              Pay: ₹{salary?.finalSalary?.toFixed(0)}
                            </div>
                          </div>
                        );
                      })() : ""}

                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceTable;

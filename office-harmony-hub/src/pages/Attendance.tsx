
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, LogIn, LogOut , ArrowLeft} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AttendanceTable from "@/components/cards/AttendanceCard";
import { useToast } from "@/hooks/use-toast";
import { getEmployees, submitClockIn, submitClockOut, getAttendanceData } from "@/services/Service";
import { useNotifications } from "@/contexts/NotificationContext";
import { Helmet } from "react-helmet-async";
import AttendanceForm from "@/Forms/AttendanceDialog"
import { useAppSelector } from "@/redux-toolkit/hooks/hook";
import { socket } from "@/socket/socket";

 const today = new Date();
const getTodayDate = () => today.toISOString().split("T")[0];


const Attendance: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  // const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [attendanceRefresh, setAttendanceRefresh] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
      const { notifications, markAsRead, deleteNotification } = useNotifications();
      const [attendanceForm, setAttendanceForm] = useState(false);
    const attendanceList = useAppSelector((state) => state.attendance.attendance);
  

  // // =================== Fetch Employees ===================
  // const handleGetEmployees = async () => {
  //   try {
  //     const data = await getEmployees(user?.companyId?._id);
  //     if (Array.isArray(data)) setEmployeeList(data);
  //   } catch (err: any) {
  //     toast({
  //       title: "Error",
  //       description: err?.response?.data?.message || "Something went wrong",
  //       variant: "destructive",
  //     });
  //   }
  // };

  // // =================== Fetch Attendance ===================
  // const handleGetAttendances = async (date: string) => {
  //   const selected = new Date(date);

  //     const month = selected.getMonth() + 1; // JS months = 0–11
  //     const year = selected.getFullYear();
  //     const companyId = user?.role === "employee"? user?.createdBy?._id : user?.companyId?._id;
  //     if(!month || !year || !companyId) return;
  //   try {
  //     const res = await getAttendanceData(month, year, companyId);
  //   } catch (err: any) {
  //     // toast({
  //     //   title: "Error",
  //     //   description: err?.response?.data?.message || "Something went wrong",
  //     //   variant: "destructive",
  //     // });
  //   }
  // };

  // useEffect(() => {
  //   handleGetAttendances(selectedDate);
  // }, [notifications]);

  // =================== Clock In/Out ===================
  const handleClockIn = async () => {
    try {
      const res = await submitClockIn(user?._id, user?.createdBy?._id);
      if (res.status === 200) {
        toast({ title: "Success", description: "You have successfully clocked in." });
        socket.emit("addAttendanceRefresh");
       setAttendanceRefresh(true);
      //  handleGetAttendances(selectedDate);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleClockOut = async () => {
    try {
      const res = await submitClockOut(user?._id, user?.createdBy?._id);
      if (res.status === 200) {
        toast({ title: "Success", description: "You have successfully clocked out." });
        socket.emit("addAttendanceRefresh");
        setAttendanceRefresh(true);
        // handleGetAttendances(selectedDate);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  // =================== Today's Attendance ===================
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAttendance = attendanceList.find((att) => {
    const attDate = new Date(att.date).toISOString().split("T")[0];
    return attDate === todayStr && att.userId?._id === user?._id;
  });

  // const attendanceUIState = useMemo(() => {
  //   if (!todayAttendance) return "NO_RECORD";

  //   switch (todayAttendance.status) {
  //     case "Clocked In":
  //       return "WORKING";
  //     case "Present":
  //     case "Half Day":
  //     case "Late":
  //       return "DAY_COMPLETED";
  //     case "Absent":
  //       return "DAY_MISSED";
  //     default:
  //       return "NO_RECORD";
  //   }
  // }, [todayAttendance]);

const attendanceUIState = useMemo(() => {
  if (!todayAttendance) return "NO_RECORD";

  // If user has clocked in but not yet clocked out
  if (todayAttendance.clockIn && (!todayAttendance.clockOut || todayAttendance.clockOut === "-")) {
    return "WORKING"; // show clock out button
  }

  // If user has clocked out
  if (todayAttendance.clockOut && todayAttendance.clockOut !== "-") {
    return "DAY_COMPLETED";
  }

  // If user never clocked in
  if (todayAttendance.status === "Absent") return "DAY_MISSED";

  return "NO_RECORD";
}, [todayAttendance]);
    
        

  return (
    <>
    <Helmet>
        <title>Attendance Page</title>
        <meta name="description" content="This is the home page of our app" />
      </Helmet>
      <AttendanceForm
      isOpen={attendanceForm}
      onClose={()=>{setAttendanceForm(false)}}
      setAttendanceRefresh={setAttendanceRefresh}
      />
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-end md:mt-[-40px]">
    
       {user?.role === "admin" && <Button size="sm" onClick={()=>{setAttendanceForm(true)}}>Update Attendance</Button>}
      </div>

      {/* Clock In/Out Card */}
      {user?.role === "employee" && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {attendanceUIState === "WORKING" ? "Currently Working" : "Today's Attendance"}
              </h2>
              <p className="text-muted-foreground">
                {attendanceUIState === "WORKING" && `Clocked in at ${todayAttendance?.clockIn}`}
                {attendanceUIState === "DAY_COMPLETED" && `Status: ${todayAttendance?.status}`}
                {attendanceUIState === "DAY_MISSED" && "You were marked absent today"}
                {attendanceUIState === "NO_RECORD" &&
                  new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
              </p>
            </div>

            {/* Buttons */}
            {attendanceUIState === "NO_RECORD" && (
              <Button onClick={handleClockIn} size="lg" className="gap-2">
                <LogIn className="w-5 h-5" /> Clock In
              </Button>
            )}
            {attendanceUIState === "WORKING" && (
              <Button variant="destructive" onClick={handleClockOut} size="lg" className="gap-2">
                <LogOut className="w-5 h-5" /> Clock Out
              </Button>
            )}
            {attendanceUIState === "DAY_COMPLETED" && (
              <Button variant="secondary" size="lg" disabled className="gap-2">
                Day Completed
              </Button>
            )}
            {attendanceUIState === "DAY_MISSED" && (
              <Button variant="outline" size="lg" disabled className="gap-2">
                Absent
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attendance Table */}
      <AttendanceTable attendanceRefresh={attendanceRefresh} setAttendanceRefresh={setAttendanceRefresh} />
    </div>
    </>
  );
};

export default Attendance;

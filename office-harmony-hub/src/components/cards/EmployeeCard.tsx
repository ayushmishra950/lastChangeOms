
import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import RelieveEmployeeCard from "@/components/cards/RelieveEmployeeCard";
import { EmployeeFormDialog } from "@/Forms/EmployeeFormDialog";
import { getEmployeebyId, handleGetPdfLetter, getAttendanceById, getSingleleaveRequestsByDate, handleAddPdfLetter as addPdfLetterApi, getSinglePayRoll } from "@/services/Service";
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from "lucide-react";
import { getStatusColorfromEmployee, getEventColor, formatDate, formatClock, getCurrentMonthAndYear } from "@/services/allFunctions";
import { Helmet } from "react-helmet-async";
import SalarySlipCard from '@/components/cards/SalarySlipCard';
import { cn } from '@/lib/utils';
import { socket } from "@/socket/socket";

const dummyLetters = [
  {
    letterType: "offer",
    pdfData: btoa("Dummy PDF Data")
  }
];
const isOnlyString = (value) => {
  if (!value) return false;

  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
  return !imageExtensions.test(value);
};


const EmployeeDashboard = () => {
  const { toast } = useToast();

  const [allLetter, setAllLetter] = useState(dummyLetters);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [relieveEmployeeId, setRelieveEmployeeId] = useState(null);
  const [isSalarySlipPreview, setIsSalarySlipPreview] = useState(false);
  const [showRelieve, setShowRelieve] = useState(false);
  const [singleUserData, setSingleUserData] = useState(null);
  const [history, setHistory] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [employeeListRefresh, setEmployeeListRefresh] = useState(false);
  const [singlePayrolls, setSinglePayrolls] = useState<any[]>([]);
  const [pdfOpenForm, setPdfOpenForm] = useState(false);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [leaveList, setLeaveList] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(getCurrentMonthAndYear());
  const [leaveSelectedDate, setLeaveSelectedDate] = useState(getCurrentMonthAndYear());
  const { id } = useParams();
  const { user } = useAuth();
  const attendanceDateRef = useRef(null);
  const leaveDateRef = useRef(null);

  const companyId = user?.companyId?._id;

  // ================= Fetch Attendance =================
  const fetchAttendances = async (date: string) => {
    try {
      const selected = new Date(date);
      const month = selected.getMonth() + 1; // JS months = 0–11
      const year = selected.getFullYear();

      if (!month || !year || !companyId) return;

      const res = await getAttendanceById(id, month, year, companyId);
      console.log(res?.data?.records)
      if (Array.isArray(res?.data?.records)) {
        let data = res?.data?.records?.filter((item: any) => item?.userId?._id === id);
        setAttendanceList(data);
      }
    } catch (err: any) {
      console.log(err);
      toast({
        title: "Error",
        description:
          err?.response?.data?.error || "Something went wrong",
      });
    }
  };


  // ================= Fetch Attendance =================
  const handleGetLeaveData = async (date: string) => {
    try {
      const selected = new Date(date);
      const month = selected.getMonth() + 1; // JS months = 0–11
      const year = selected.getFullYear();
      if (!id) return;

      const res = await getSingleleaveRequestsByDate(id, companyId, month, year);
      console.log(res);
      if (Array.isArray(res?.data?.requests)) {
        setLeaveList(res.data.requests);
      }
    } catch (err: any) {
      console.log(err);
      toast({
        title: "Error",
        description:
          err?.response?.data?.error || "Something went wrong",
      });
    }
  };
  useEffect(() => {
    if (user?.companyId?._id) {
      fetchAttendances(selectedDate);
      handleGetLeaveData(leaveSelectedDate);
    }
  }, [user, selectedDate, leaveSelectedDate]);

  const showSalarySlip = async () => {
    if (!singlePayrolls || singlePayrolls.length === 0) return toast({ title: "Slip Error", description: "Salary Slip Not Found.", variant: "destructive" })
    setPdfOpenForm(true);
  }

  const handleGetEmployee = async () => {
    try {
      const data = await getEmployeebyId(id, user?.companyId?._id); // poora list fetch
      console.log(data);
      if (data) {
        setSingleUserData(data.employee || null);
        setHistory(data.history || []);
        setTasks(data?.task || [])
      } else {
        setSingleUserData(null);
        setHistory([]);
        setTasks([]);
      }
    } catch (err: any) {
      console.log(err);
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Something went wrong",
      });
    }
  };


  //--------------------- Add Employee All Letters---------------------------------------
  const handleAddPdfLetter = async (type: string) => {
    const obj = {
      employeeId: id,
      letterType: type,
    };
    console.log("Adding PDF Letter with obj:", obj);
    try {
      const response = await addPdfLetterApi(obj); // call the global function
      console.log("Add PDF Letter Response:", response);

      if (response.success) {
        GetPdfLetter(id); // refresh list if needed
      } else {
        console.error("Failed to add PDF letter", response.error);
        toast({
          title: "Error",
          description: `Something went wrong: ${response.error?.message || "Unknown error"}`,
        });
      }
    } catch (err: any) {
      console.error("Error adding PDF letter:", err);
      toast({
        title: "Error",
        description: `Something Went Wrong: ${err.response?.data?.message || err.message}`,
      });
    }
  };

  //--------------------- Get Employee All Letters---------------------------------------

  const GetPdfLetter = async (id) => {
    try {
      // 2️⃣ API call with Authorization header
      const data = await handleGetPdfLetter(id);
      console.log("Fetched PDF Letters:", data);

      if (data) {
        setAllLetter(Array.isArray(data) ? data : [data]);
      }
    } catch (err) {
      console.error("Error adding department:", err);
      toast({
        title: 'Error',
        description: `Something Went Wrong :- ${err.response?.data?.message}`,
      });
    }
  };
  useEffect(() => {
    socket.on("getPayrollRefresh", () => {
      if(user?.role==="admin"){
      handleGetSinglePayRoll();
      }
    });
    socket.on("getLeaveRefresh", () => {
       if(user?.role==="admin"){
      handleGetLeaveData(leaveSelectedDate);
       }
    });
    socket.on("getEmployeeRefresh", () => {
       if(user?.role==="admin"){
      handleGetEmployee();
       }
    });
    socket.on("getAttendanceRefresh", () => {
       if(user?.role==="admin"){
      fetchAttendances(selectedDate);
       }
    });

    return () => {
      socket.off("getPayrollRefresh");
      socket.off("getLeaveRefresh");
      socket.off("getEmployeeRefresh");
      socket.off("getAttendanceRefresh");
    };
  }, []);



  const handleGetSinglePayRoll = async () => {
    if (!id || !user?.companyId?._id) return;
    try {
      const data = await getSinglePayRoll(id, user?.companyId?._id);
      console.log("Single Payroll:", data);
      if (Array.isArray(data)) {
        setSinglePayrolls(data);
      }
    } catch (error) {
      console.error("Error fetching all payrolls:", error);
    }
  };

  useEffect(() => {
    if (!user) return; // agar user null ho to kuch na kare

    if (user.role === 'admin') {
      handleGetSinglePayRoll();
    }
  }, [user]);

  useEffect(() => {
    if (employeeListRefresh) {
      handleGetEmployee();
      setEmployeeListRefresh(false); // call hone ke baad reset
    }
  }, [employeeListRefresh]);

  useEffect(() => {
    handleGetEmployee();
    GetPdfLetter(id);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Helmet>
        <title>Employe Detail Page</title>
        <meta name="description" content="This is the home page of our app" />
      </Helmet>
      {pdfOpenForm && <SalarySlipCard data={singlePayrolls} onClose={() => setPdfOpenForm(false)} />}
      {/* Top Navbar / Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Detailed view for {singleUserData?.fullName}</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColorfromEmployee(singleUserData?.status)}`}>
              {singleUserData?.status}
            </span>
          </div>
        </div>
      </header>

      <EmployeeFormDialog
        open={isDialogOpen}
        onClose={() => { setIsDialogOpen(false) }}
        isEditMode={isEditDialogOpen}
        initialData={singleUserData}
        setEmployeeListRefresh={setEmployeeListRefresh}
        selectedDepartmentName={""} //blank hai kyuki y sirf department k case m use hoga
      />
      {
        showRelieve && (
          <RelieveEmployeeCard
            onClose={() => setShowRelieve(false)}
            employeeId={relieveEmployeeId}
            setRelieveEmployeeId={setRelieveEmployeeId}
            setEmployeeListRefresh={setEmployeeListRefresh}
          />
        )
      }

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Profile & Quick Info */}
          <div className="lg:col-span-4 space-y-6">
            {/* Profile Card */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md overflow-hidden">
              <div className="p-6 text-center border-b dark:border-gray-800">
                <img
                  src={singleUserData?.profileImage}
                  alt={singleUserData?.fullName}
                  className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                />
                <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{singleUserData?.fullName}</h2>
                <p className="text-gray-600 dark:text-gray-400">{singleUserData?.designation}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{singleUserData?.department} • {singleUserData?.employeeType}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">{singleUserData?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Contact</p>
                  <p className="font-medium text-gray-900 dark:text-white">{singleUserData?.contact}</p>
                </div>
              {isOnlyString(singleUserData?.documents?.aadhaar) && (
  <div>
    <p className="text-sm text-gray-500 dark:text-gray-400">Aadhar Card Number</p>
    <p className="font-medium text-gray-900 dark:text-white">
      {singleUserData?.documents?.aadhaar}
    </p>
  </div>
)}

{isOnlyString(singleUserData?.documents?.panCard) && (
  <div>
    <p className="text-sm text-gray-500 dark:text-gray-400">Pan Card Number</p>
    <p className="font-medium text-gray-900 dark:text-white">
      {singleUserData?.documents?.panCard}
    </p>
  </div>
)}

{isOnlyString(singleUserData?.documents?.bankPassbook) && (
  <div>
    <p className="text-sm text-gray-500 dark:text-gray-400">Bank Passbook Number</p>
    <p className="font-medium text-gray-900 dark:text-white">
      {singleUserData?.documents?.bankPassbook}
    </p>
  </div>
)}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Join Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(singleUserData?.joinDate)}</p>
                </div>
                {singleUserData?.relievingDate && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Relieving Date</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatDate(singleUserData?.relievingDate)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {["offer", "join", "relieve", "recommendation", "noc"]?.map((type) => {
                  const labelMap = {
                    offer: "Offer Letter",
                    join: "Join Letter",
                    relieve: "Relieving",
                    recommendation: "Recommendation",
                    noc: "NOC",
                  };
                  const bgColor = {
                    offer: "bg-blue-600 hover:bg-blue-700",
                    join: "bg-green-600 hover:bg-green-700",
                    relieve: "bg-blue-600 hover:bg-blue-700",
                    recommendation: "bg-green-600 hover:bg-green-700",
                    noc: "bg-blue-600 hover:bg-blue-700",
                  };


                  const existingLetter = allLetter?.find((letter) => letter.letterType === type);

                  return existingLetter ? (
                    <button
                      key={type}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition"
                      onClick={() => {
                        // Convert base64 to Blob URL
                        const blob = new Blob([Uint8Array.from(atob(existingLetter.pdfData), c => c.charCodeAt(0))], {
                          type: "application/pdf",
                        });
                        const url = URL.createObjectURL(blob);

                        // Store in state
                        setPreviewDoc({
                          name: existingLetter?.letterType, // Store the letter name
                          url: url,     // Store the blob URL
                          type: "pdf",
                        });
                        setIsPreview(true)
                      }}
                    >
                      View {labelMap[type]}
                    </button>
                  ) : (
                    <button
                      key={type}
                      className={`px-4 py-2 ${bgColor[type]} text-white rounded-lg text-sm font-medium transition`}
                      onClick={() => handleAddPdfLetter(type)}
                    >
                      {labelMap[type]}
                    </button>
                  );
                })}

                {/* Keep the last three buttons as-is */}
                <button
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                  onClick={() => {
                    showSalarySlip();
                  }}
                >
                  All Salary Slips
                </button>
                <button
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
                  onClick={() => { setIsEditDialogOpen(true); setIsDialogOpen(true); }}
                >
                  Update Profile
                </button>
                <button
                  disabled={singleUserData?.status === "RELIEVED"}
                  onClick={() => { setRelieveEmployeeId(singleUserData?._id); setShowRelieve(true); }}
                  className={`
                    px-4 py-2 text-white rounded-lg text-sm font-medium transition
                    ${singleUserData?.status === "RELIEVED"
                      ? "bg-gray-400 cursor-not-allowed opacity-70"
                      : "bg-red-600 hover:bg-red-700 cursor-pointer"
                    }
                   `}
                >
                  {singleUserData?.status === "RELIEVED" ? "Relieved" : "Relieve Employee"}
                </button>

              </div>
            </div>

            {/* Documents Quick View */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Documents Status</h3>

              <div className="space-y-3">
                {singleUserData?.documents && Object.entries(singleUserData.documents).length > 0 ? (
                  Object.entries(singleUserData.documents).map(([name, url]) => (
                    <div key={name} className="flex justify-between items-center text-sm">
                      <span
                        className={`cursor-pointer ${url ? "text-blue-600 dark:text-blue-400" : "text-gray-400 cursor-not-allowed"}`}
                        onClick={() => {
                          if (!url) return;
                          setPreviewDoc({ name, url, type: "image" });
                          setIsPreview(true);
                        }}
                      >
                        {name}
                      </span>

                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium  ${url ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                      >
                        {url ? "Uploaded" : "Missing"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-[120px] text-sm text-gray-500 dark:text-gray-400">
                    No documents available
                  </div>
                )}
              </div>

            </div>
          </div>

          {isPreview && previewDoc && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-3">
              {/* Modal Card */}
              <div
                className={`
                  bg-white dark:bg-gray-900
                  ${previewDoc.type === "pdf"
                    ? "w-[95vw] sm:w-[700px] md:w-[900px] max-h-[95vh]"
                    : "w-[90vw] sm:w-[420px] md:w-[500px] max-h-[85vh]"
                  }
                  rounded-xl shadow-lg
                  p-4 sm:p-5
                  relative
                  overflow-hidden
                `}
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base sm:text-lg font-semibold truncate">
                    {previewDoc.name}
                  </h3>
                  <button
                    onClick={() => setIsPreview(false)}
                    className="text-xl px-2 hover:opacity-70"
                  >
                    ✕
                  </button>
                </div>

                {/* Preview */}
                <div
                  className={`
                  border rounded-md
                  ${previewDoc.type === "pdf"
                      ? "h-[400px] sm:h-[520px] md:h-[600px]"
                      : "h-[220px] sm:h-[300px] md:h-[350px]"
                    }
                  flex items-center justify-center
                `}
                >
                  {previewDoc.type === "pdf" ? (
                    <iframe
                      src={previewDoc.url}
                      className="w-full h-full"
                      title={previewDoc.name}
                    />
                  ) : (
                    <img
                      src={previewDoc.url}
                      alt={previewDoc.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
                {/* Actions (only for image) */}
                {previewDoc.type === "image" && (
                  <div className="flex justify-end gap-3 mt-4">
                    <a
                      href={previewDoc.url}
                      download
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                    >
                      Download
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Salary & Compensation */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Salary & Compensation</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Salary</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{singleUserData?.monthSalary?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">LPA</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{singleUserData?.lpa} LPA</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Increment Date</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {
                      // salary change history ka latest entry
                      (() => {
                        const lastSalaryChange = [...history]?.filter(item => item.eventType === "SALARY_CHANGE").slice(-1)[0]; // last entry
                        return lastSalaryChange
                          ? new Date(lastSalaryChange.effectiveFrom).toLocaleDateString("en-IN")
                          : 'No increment yet';
                      })()
                    }
                  </p>
                </div>
              </div>

              {history && history.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Salary History</h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {history
                      .filter(hist => hist.eventType === "SALARY_CHANGE") // sirf salary change entries
                      .map((hist, i) => (
                        <div key={i} className="flex justify-between items-center text-sm border-b dark:border-gray-800 pb-3 last:border-0">
                          {/* Date */}
                          <span className="text-gray-900 dark:text-white">
                            {new Date(hist.effectiveFrom).toLocaleDateString("en-IN")}
                          </span>

                          {/* Salary change */}
                          <span className="text-gray-600 dark:text-gray-400">
                            ₹{Number(hist.oldData.monthSalary).toLocaleString()} → ₹{Number(hist.newData.monthSalary).toLocaleString()}
                          </span>

                          {/* Remarks */}
                          {hist.remarks && (
                            <span className="text-xs text-gray-500">({hist.remarks})</span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Role & Projects */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Role & Responsibilities
              </h2>

              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {singleUserData?.roleResponsibility || "No role description available"}
              </p>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Assigned Teams / Task
              </h3>

              {tasks && tasks?.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto pr-2 projects-scroll">
                  {tasks?.map((task, i) => (
                    <span
                      key={task?._id}
                      className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm"
                    >
                      {task.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[120px] text-sm text-gray-500 dark:text-gray-400">
                  No projects assigned
                </div>
              )}
            </div>
            {/* Attendance History */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
              <div className='flex flex-row justify-between'>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Attendance History
                </h2>
                <input type='month' value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className='w-22 h-6 border text-sm border-gray-500 rounded-md' />
              </div>
              {attendanceList && attendanceList.length > 0 ? (
                <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2 remarks-scroll">
                  {attendanceList.map((attendance, i) => {
                    return (
                      <li
                        key={i}
                        className="text-gray-700 dark:text-gray-300 flex flex-col sm:flex-row sm:items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "mr-2",
                              attendance.status === "Clock In"
                                ? "text-green-500"
                                : attendance.status === "Clock Out"
                                  ? "text-red-500"
                                  : "text-gray-400"
                            )}
                          >
                            •
                          </span>
                          <span className="font-medium">{attendance.status}</span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(attendance.date)}{" "} {formatClock(attendance?.clockIn)} - {formatClock(attendance?.clockOut)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex items-center justify-center h-[120px] text-sm text-gray-500 dark:text-gray-400">
                  No attendance available
                </div>
              )}
            </div>

            {/* Leave History */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
              <div className='flex flex-row justify-between'>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Leave History
                </h2>
                <input type='month' value={leaveSelectedDate} onChange={(e) => setLeaveSelectedDate(e.target.value)} className='w-22 h-6 border text-sm border-gray-500 rounded-md' />
              </div>


              {Array.isArray(leaveList) && leaveList.length > 0 ? (
                <ul className="space-y-4 max-h-[400px] overflow-y-auto pr-2 remarks-scroll">
                  {leaveList.map((leave) => {
                    const from = new Date(leave.fromDate).toLocaleDateString(); // format as per locale
                    const to = new Date(leave.toDate).toLocaleDateString();

                    return (
                      <li
                        key={leave._id}
                        className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md flex flex-col space-y-1 shadow-sm"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {leave.leaveType?.name || "N/A"}
                          </span>
                          <span
                            className={`text-sm font-medium ${leave.status === "Approved"
                              ? "text-green-500"
                              : leave.status === "Rejected"
                                ? "text-red-500"
                                : "text-yellow-500"
                              }`}
                          >
                            {leave.status}
                          </span>
                        </div>
                        <div className="text-gray-700 dark:text-gray-300 text-sm">
                          {leave.description}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 text-sm">
                          {from} - {to} ({leave.totalDays} {leave.totalDays > 1 ? "days" : "day"})
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex items-center justify-center h-[120px] text-sm text-gray-500 dark:text-gray-400">
                  No leaves available
                </div>
              )}
            </div>

            {/* Remarks */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Remarks & Notes
              </h2>
              {singleUserData?.remarks ? (
                Array.isArray(singleUserData.remarks) ? (
                  singleUserData.remarks.length > 0 ? (
                    <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2 remarks-scroll">
                      {singleUserData.remarks.map((remark, i) => (
                        <li
                          key={i}
                          className="text-gray-700 dark:text-gray-300 flex items-start"
                        >
                          <span className="text-green-500 mr-2">•</span>
                          {remark}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center justify-center h-[120px] text-sm text-gray-500 dark:text-gray-400">
                      No remarks available
                    </div>
                  )
                ) : (
                  // remarks sirf string ho to
                  <div className="text-gray-700 dark:text-gray-300">
                    {singleUserData.remarks}
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-[120px] text-sm text-gray-500 dark:text-gray-400">
                  No remarks available
                </div>
              )}
            </div>
            {/* History Timeline */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Activity History
              </h2>
              {history.length === 0 ? (
                /* NO HISTORY STATE */
                <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400 text-sm">
                  No history found
                </div>
              ) : (
                /* HISTORY LIST */
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                  {history.map((event) => (
                    <div key={event._id} className="flex">
                      <div className="flex-shrink-0 mr-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${getEventColor(
                            event.eventType
                          )}`}
                        >
                          {event.eventType.charAt(0)}
                        </div>
                      </div>

                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {event.eventType.replaceAll("_", " ")}
                          </h4>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {event.effectiveFrom
                              ? new Date(event.effectiveFrom).toLocaleDateString("en-IN")
                              : event.createdAt
                                ? new Date(event.createdAt).toLocaleDateString("en-IN")
                                : "N/A"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Changed by: {event?.changedBy?.admins?.[0]?.username || "Admin"}
                          {event.remarks && ` • ${event.remarks}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;

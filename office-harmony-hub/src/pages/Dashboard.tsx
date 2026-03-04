import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StatCard from '@/components/dashboard/StatCard';
import { Users, Building2, FolderKanban, Clock, CalendarDays, Receipt, TrendingUp, CheckCircle2, AlertCircle, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardPage } from "@/services/Service";
import { useToast } from '@/hooks/use-toast';
import { formatDate } from "@/services/allFunctions";
import { Helmet } from "react-helmet-async";
import { useNavigate } from 'react-router-dom';
import CompanyList from "@/components/cards/CompanyCard";
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/hooks/hook';
import { getDashboardData } from '@/redux-toolkit/slice/allPage/dashboardSlice';
import { socket } from "@/socket/socket";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  // const [dashboardData, setDashboardData] = useState(null);
  const navigate = useNavigate();
  const dashboardData = useAppSelector((state) => state?.dashboard?.dashboardData);
  const dispatch = useAppDispatch();
  const [pageLoading, setPageLoading] = useState(false);

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'badge-info',
      medium: 'badge-warning',
      high: 'badge-destructive',
      urgent: 'bg-destructive text-destructive-foreground',
    };
    return <span className={`${styles[priority]} px-2 py-1 rounded-full text-xs font-medium`}>{priority}</span>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'in_progress':
        return <Timer className="w-4 h-4 text-warning" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  useEffect(() => {
    socket.on("getProjectRefresh", () => {
      if (user?.role !== "super_admin") {
        handleGetDashboard();
      }
    });
    socket.on("getTaskRefresh", () => {
      if (user?.role !== "super_admin") {
        handleGetDashboard();
      }
    });
    socket.on("getSubTaskRefresh", () => {
      if (user?.role !== "super_admin") {
        handleGetDashboard();
      }
    });
    socket.on("getEmployeeRefresh", () => {
      if (user?.role !== "super_admin") {
        handleGetDashboard();
      }
    });
    socket.on("getLeaveRefresh", () => {
      if (user?.role !== "super_admin") {
        handleGetDashboard();
      }
    });
    socket.on("getAttendanceRefresh", () => {
      if (user?.role !== "super_admin") {
        handleGetDashboard();
      }
    });



    return () => {
      socket.off("getProjectRefresh");
      socket.off("getEmployeeRefresh");
      socket.off("getTaskRefresh");
      socket.off("getEmployeeRefresh");
      socket.off("getSubTaskRefresh");
      socket.off("getEmployeeRefresh");
      socket.off("getLeaveRefresh");
      socket.off("getAttendanceRefresh");
    };
  }, []);


  const handleGetDashboard = async () => {
    if (user && user?.role === "super_admin") return;
    if (!user?._id || (!user?.companyId?._id && !user?.createdBy?._id)) return toast({ title: "Error", description: "required field Missing.", variant: "destructive" });
    setPageLoading(true);
    try {
      const res = await getDashboardPage(user?._id, user?.companyId?._id || user?.createdBy?._id);
      console.log(res);
      if (res.status === 200) {
        // Dispatch action to update dashboard data in Redux store
        dispatch(getDashboardData(res?.data?.summary));
      }
    }
    catch (err) {
      console.log(err);
      toast({ title: "Error", description: err?.response?.data?.message || err?.message, variant: "destructive" })
    }
    finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if ((user && user?.role !== "super_admin") && Object.keys(dashboardData).length === 0) {
      handleGetDashboard();
    }
  }, [dashboardData, user])


  if (pageLoading && (Object.keys(dashboardData).length === 0)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard Page</title>
        <meta name="description" content="This is the home page of our app" />
      </Helmet>

      <div className="space-y-6">
        {(user?.role === "super_admin") && (<CompanyList />)}
        {user?.role !== 'super_admin' && <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 py-2">

            {(user?.role === 'admin') && (
              <>
                <StatCard
                  title="Total Employees"
                  value={dashboardData?.totalEmployees}
                  change={`+${dashboardData?.employeeGrowth} this month`}
                  changeType="positive"
                  icon={Users}
                />
                <StatCard
                  title="Pending Tasks"
                  value={dashboardData?.pendingTask}
                  change={`${dashboardData?.urgentTask} urgent`}
                  changeType="negative"
                  icon={FolderKanban}
                />
                <StatCard
                  title="Today's Attendance"
                  value={`${dashboardData?.attendancePercentage}%`}
                  change={`${dashboardData?.todayPresentCount}/${dashboardData?.totalEmployees} present`}
                  changeType="neutral"
                  icon={Clock}
                />

                <StatCard
                  title="Pending Leaves"
                  value={dashboardData?.pendingLeave}
                  change={`${dashboardData?.newLeavesThisMonth} new requests`}
                  changeType="neutral"
                  icon={CalendarDays}
                />

                <StatCard
                  title="Expenses"
                  value={`₹${dashboardData?.expenseThisMonth}`}
                  // change="12 requests"
                  changeType="neutral"
                  icon={Receipt}
                />
              </>
            )}


            {(user?.role === 'employee') && (
              <>

                <StatCard
                  title="Pending Tasks"
                  value={dashboardData?.pendingTask}
                  change={`${dashboardData?.urgentTask} urgent`}
                  changeType="negative"
                  icon={FolderKanban}
                />

                <StatCard
                  title="Pending Leaves"
                  value={dashboardData?.pendingLeave}
                  change={`${dashboardData?.leavesThisMonth} new requests`}
                  changeType="neutral"
                  icon={CalendarDays}
                />

              </>
            )}


          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-primary" />
                  Recent {user?.role === "admin" ? "Task" : ""}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.recentTasks?.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.recentTasks.slice(0, 5).map((task) => (
                      <div
                        key={task._id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(task.status)}
                          <div>
                            <div className="flex justify-between items-center">
                              <p className="font-medium text-sm">{task.name}</p>
                              <p className="text-sm md:ml-6 text-muted-foreground">
                                Assigned To: {task?.managerId?.fullName || task?.employeeId?.fullName || task?.adminId?.username}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">Due: {formatDate(task.endDate)}</p>
                          </div>
                        </div>
                        {getPriorityBadge(task.priority)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-32 text-muted-foreground font-medium">
                    {user?.role === "admin" ? "Task" : ""} Not Found
                  </div>
                )}
              </CardContent>
            </Card>


            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {
                    dashboardData?.recentActivity?.length === 0 ?
                      <>
                        <div className="flex items-center mt-6 justify-center h-full text-center text-muted-foreground">
                          No Recent Activity.
                        </div>

                      </>
                      :
                      dashboardData?.recentActivity?.slice(0, 5)?.map((activity) => (
                        <div
                          key={activity?._id}
                          className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{activity?.title}</p>
                            <p className="text-xs text-muted-foreground">
                              by {activity?.createdBy?.username || activity?.createdBy?.fullName} • {formatDate(activity?.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions for Employee */}
          {user?.role === 'employee' && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button onClick={() => { navigate("/attendances") }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
                    <Clock className="w-8 h-8 text-primary" />
                    <span className="text-sm font-medium">Clock In</span>
                  </button>
                  <button onClick={() => { navigate("/leaves") }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-success/10 hover:bg-success/20 transition-colors">
                    <CalendarDays className="w-8 h-8 text-success" />
                    <span className="text-sm font-medium">Apply Leave</span>
                  </button>
                  {/* <button onClick={()=>{Navigate("/attendance")}} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-warning/10 hover:bg-warning/20 transition-colors">
                <Receipt className="w-8 h-8 text-warning" />
                <span className="text-sm font-medium">Submit Expense</span>
              </button> */}
                  <button onClick={() => { navigate("/tasks") }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-info/10 hover:bg-info/20 transition-colors">
                    <FolderKanban className="w-8 h-8 text-info" />
                    <span className="text-sm font-medium">View Tasks</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
        }

      </div>

    </>
  );
};

export default Dashboard;

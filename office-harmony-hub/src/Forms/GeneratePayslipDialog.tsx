import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { addPayRoll, getEmployees, getEmployeebyId } from "@/services/Service";
import { Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from "@/contexts/AuthContext";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getEmployeeList } from "@/redux-toolkit/slice/allPage/userSlice";
import { socket } from "@/socket/socket";


const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];


const generateYears = (numPastYears = 5) => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i <= numPastYears; i++) {
    years.push((currentYear - i).toString());
  }
  return years;
};

const years = generateYears(5);

export default function GeneratePayslipDialog({
  open,
  onOpenChange,
  setSalarySlipRefresh,
  initialData,
}) {
    const { user } = useAuth();
  const { toast } = useToast();
  // const [employees, setEmployees] = useState([]);
  const [obj, setObj] = useState({
    employeeId: '',
    month: '',
    year: '',
    basic: '',
    allowance: '',
    deductions: '',
    departmentName: '',
  })
  const [loading, setLoading] = useState(false);
  const isEditMode = Boolean(initialData);
  const dispatch = useAppDispatch();
  const employees = useAppSelector((state) => state.user.employees);

  useEffect(() => {
     if(user?.role === "admin" && employees.length === 0){
      handleGetEmployees();
     }
  },[user?._id, user?.companyId?._id, employees.length]);
  useEffect(() => {
    if (initialData) {
      setObj({
        employeeId: initialData.employeeId || '',
        month: initialData.month || '',
        year: initialData.year || '',
        basic: initialData.basic || '',
        allowance: initialData.allowance || '',
        deductions: initialData.deductions || '',
        departmentName: initialData.department || '',
      });
    }
  }, [initialData]);

  useEffect(() => {
      socket.on("getEmployeeRefresh", () => {
        handleGetEmployees();
      });
  
      return () => {
        socket.off("getEmployeeRefresh");
      };
    }, []);

  const handleChange = (key, value) => {
    setObj((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleEmployeeSelect = (employeeId) => {
    const emp = employees.find(e => e._id === employeeId);
    if (emp) {
      setObj(prev => ({
        ...prev,
        employeeId: emp._id,
        departmentName: emp.department, // or emp.department.name
      }));
    }
  };

  const handleGetEmployees = async () => {
    try {
      let data = [];
       if(user?.role === "admin"){
       data = await getEmployees(user?.companyId?._id);
       }
       else if(user?.role === "employee"){
       data = await getEmployeebyId(user?._id, user?.createdBy?._id);
       }
      console.log("employee Data:", data);
      if (Array.isArray(data)) {
        // setEmployees(data);
        dispatch(getEmployeeList(data));
      }
    } catch (err) {
      console.log(err);
      // toast({
      //   title: "Error",
      //   description: err?.response?.data?.message || "Something went wrong",
      //   variant:"destructive"
      // });
    }
  };

  const handleSubmit = async (e?:React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let response = null;
    console.log("hiii")
    try {
      if (isEditMode) {
        // response = await updatePayslip(obj);
      } else {
        response = await addPayRoll({...obj,companyId : user?.companyId?._id});
      }
      console.log("Payslip Response:", response);
      if (response.status === 201 || response.status === 200) {
        socket.emit("addPayrollRefresh");
        setObj({ employeeId: '', month: '', year: '', basic: '', allowance: '', deductions: '', departmentName: '' });
        toast({ title: isEditMode ? "Payslip Updated" : "Payslip Generated", description: `The payslip has been successfully ${isEditMode ? "updated" : "generated"}.` });
      }
      else {
        toast({ title: "Error", description: response?.statusText || "Something went wrong. Please try again.", variant: "destructive" });
      }

    } catch (error) {
      console.error(error);
      toast({ title: "Server Error", description: error?.response?.data?.message || error.message || "An unexpected error occurred.", variant: "destructive", });
    } finally {
      setLoading(false);
      setSalarySlipRefresh(true);
      onOpenChange(false);
    }
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
       
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Update Salary Slip" : "Generate Salary Slip"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update the salary details for this employee." : "Create a salary slip for an employee."}
          </DialogDescription>

        </DialogHeader>

        <form className="space-y-4 mt-4" onSubmit={handleSubmit}>
          {/* Employee */}
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select
              value={obj.employeeId}
              onValueChange={handleEmployeeSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp._id} value={emp._id}>
                    {emp.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month & Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select
                value={obj.month}
                onValueChange={(value) => handleChange("month", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {months.map((month) => (
                    <SelectItem
                      key={month}
                      value={month.toLowerCase()}
                    >
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                value={obj.year}
                onValueChange={(value) => handleChange("year", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Salary */}
          <div className="space-y-2">
            <Label>Basic Salary (₹)</Label>
            <Input
              type="number"
              value={obj.basic}
              onChange={(e) => handleChange("basic", e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Allowances (₹)</Label>
              <Input
                type="number"
                value={obj.allowance}
                onChange={(e) => handleChange("allowance", e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Deductions (₹)</Label>
              <Input
                type="number"
                value={obj.deductions}
                onChange={(e) => handleChange("deductions", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              // onClick={handleSubmit}
              disabled={loading || !obj?.employeeId || !obj?.allowance || !obj?.basic || !obj?.deductions || !obj?.departmentName || !obj?.month || !obj?.year}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? "Updating..." : "Generating..."}
                </>
              ) : (
                isEditMode ? "Update" : "Generate"
              )}
            </Button>

          </div>
        </form>
      </DialogContent>
    </Dialog>

  );
}

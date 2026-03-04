import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, X } from "lucide-react";
import { getDepartments, getEmployees, addTaskManager, updateTaskManager } from "@/services/Service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { socket } from "@/socket/socket";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getEmployeeList } from "@/redux-toolkit/slice/allPage/userSlice";
import {getDepartment} from "@/redux-toolkit/slice/allPage/departmentSlice";

interface ManagerFormProps {
    isOpen: boolean;
    onIsOpenChange: (open: boolean) => void;
    initialData?: any;
    setManagerRefresh?: (boolean) => void;
    managerData?: any;
}

const AddManagerForm: React.FC<ManagerFormProps> = ({
    isOpen,
    onIsOpenChange,
    initialData,
    setManagerRefresh,
    managerData
}) => {
    const [department, setDepartment] = useState<string>("none");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState(true);
    const [loading, setLoading] = useState(false);
    // const [departmentList, setDepartmentList] = useState<any[]>([]);
    // const [employeeList, setEmployeeList] = useState<any[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<string>("");
    const dispatch = useAppDispatch();
    const employeeList = useAppSelector((state)=> state?.user?.employees);
    const departmentList = useAppSelector((state)=> state?.department?.departments);

    const { toast } = useToast();
    const { user } = useAuth();

    const resetForm = () => {
        setDepartment("none");
        setFilteredEmployees([]);
        setSelectedEmployee("");
        setDescription("");
        setStatus(true)
    }
    console.log(managerData)
   useEffect(() => {
    if (!isOpen) return; // only initialize when modal opens

    const dataToUse = managerData || initialData;
   console.log(dataToUse)
    if (dataToUse) {
        setDepartment(dataToUse.department || "none");
        setDescription(dataToUse.description || "");
        setStatus(dataToUse.taskRoleStatus === "active");
        setSelectedEmployee(dataToUse._id?.toString() || "");

        // Filter employees for selected department
        const filtered = employeeList.filter(emp => emp.department === dataToUse.department);
        setFilteredEmployees(filtered);
    } else {
        resetForm();
    }
}, [initialData, managerData, isOpen, employeeList]);

    useEffect(() => {
        socket.on("getEmployeeRefresh", () => {
            console.log("getEmployeeRefresh");
            handleGetEmployees();
        });

        return () => {
            socket.off("getTaskRefresh");
        };
    }, []);

    //====================================  Submit Forms=======================================================
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!department || (filteredEmployees.length > 0 && !selectedEmployee)) {
            toast({
                title: "Error",
                description: "Please fill all required fields",
            });
            return;
        }
        setLoading(true);

        const payload = {
            department,
            employeeId: selectedEmployee || null,
            description,
            status,
        };
        let res = null;
        try {
            if (!initialData) {
                // Add Mode
                res = await addTaskManager(user?._id, user?.companyId?._id, payload);

            } else {
                // Edit Mode
                res = await updateTaskManager(user?._id, user?.companyId?._id, payload);

            }
            console.log(res)
            if (res.status === 200 || res.status === 201) {
                toast({ title: `${initialData ? "Update Manager." : "Add Manager"}`, description: res.data.message });
                onIsOpenChange(false); // close modal after success
                setManagerRefresh(true);
                socket.emit("addEmployeeRefresh");
                socket.emit("updateManagerRefreshForFrontend", {selectedEmployee,oldEmployee: initialData?._id});
            }

        } catch (err: any) {
            console.error("Error:", err);
            toast({
                title: "Error in Add Manager Form",
                description: err?.response?.data?.message || "Something went wrong",
            });
        } finally {
            setLoading(false);
        }
    };

    // Fetch Departments
    const handleGetDepartment = async () => {
        try {
            const data = await getDepartments(user?.companyId?._id);
            // setDepartmentList(data);
            dispatch(getDepartment(data))
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.response?.data?.message || "Something went wrong",
            });
        }
    };
    // Fetch Employees
    const handleGetEmployees = async () => {
        try {
            const data = await getEmployees(user?.companyId?._id);
            console.log(data);
            // setEmployeeList(data);
            dispatch(getEmployeeList(data))

            // If Edit Mode, filter employees for selected department
            if (initialData && initialData.department) {
                const filtered = data.filter(emp => emp.department === initialData.department);
                setFilteredEmployees(filtered);
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err?.response?.data?.message || "Something went wrong",
            });
        }
    };
    // Handle Department Change
    const handleDepartmentChange = (value: string) => {
        setDepartment(value);
        if (value === "none") {
            setFilteredEmployees([]);
            setSelectedEmployee("");
        } else {
            const filtered = employeeList.filter(emp => emp.department === value);
            setFilteredEmployees(filtered);
            setSelectedEmployee(""); // reset selection
        }
    };
    useEffect(()=>{
        if(employeeList?.length===0|| isOpen){
            handleGetEmployees();
        }
    },[employeeList?.length, isOpen])
    useEffect(() => {
       if(departmentList?.length===0|| isOpen){
 handleGetDepartment();
       }   
    }, [isOpen]);

    return <Dialog open={isOpen} onOpenChange={(open) => { resetForm(); onIsOpenChange(open) }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{initialData ? "Edit Manager" : "Add Manager"}</DialogTitle>
                <DialogDescription>Manager Form</DialogDescription>
            </DialogHeader>
            <form id="create-more-manager-form" onSubmit={handleSubmit} className="space-y-3">
                {/* Department */}
                <div>
                    <Label className="text-sm">Department*</Label>
                    <Select value={department} onValueChange={handleDepartmentChange}>
                        <SelectTrigger className="w-full truncate">
                            <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {departmentList.map((dep) => (
                                <SelectItem key={dep._id} value={dep.name} className="cursor-pointer">
                                    {dep.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Employees - show only if filteredEmployees.length > 0 */}
                    <div>
                        <Label className="text-sm">Employee*</Label>
                        <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={department==="none"}>
                            <SelectTrigger className="w-full truncate">
                                <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredEmployees.map(emp => {
                                    const isManager = emp?.taskRole === "manager";
                                    return (
                                        <SelectItem

                                            key={emp?._id}
                                            value={emp?._id?.toString()}
                                            disabled={isManager}
                                            className={isManager ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} >
                                            {emp?.fullName} {isManager && "(manager)"}
                                        </SelectItem>
                                    );
                                })}

                            </SelectContent>
                        </Select>
                    </div>
                    { department === "none" && (
                        <p className="text-xs text-red-500">
                            Please Select at least one Department.
                        </p>
                    )   }
                
                    { department !== "none" && filteredEmployees.length === 0 && (
                        <p className="text-xs text-red-500">
                            There is no employee in the selected department.
                        </p>
                    )   }

                {/* Description */}
                <div>
                    <Label className="text-sm">Description</Label>
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Add description(Optional)"
                    />
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                    <Switch checked={status} onCheckedChange={setStatus} />
                    <span className="text-sm">{status ? "Active" : "Inactive"}</span>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => { onIsOpenChange(false); resetForm() }}
                        disabled={loading}
                        className="w-full"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="create-more-manager-form"
                        disabled={
                            loading ||
                            (!department || department === "none") ||
                            (filteredEmployees.length > 0 && !selectedEmployee)

                        }
                        className="w-full"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        {initialData ? "Update" : "Save"}
                    </Button>
                </div>
            </form>
        </DialogContent>
    </Dialog>
};

export default AddManagerForm;

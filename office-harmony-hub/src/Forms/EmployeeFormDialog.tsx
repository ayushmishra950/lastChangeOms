
import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, Eye, EyeOff, ChevronDown } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getDepartments, addEmployees, updateEmployees } from "@/services/Service";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateFromInput } from "@/services/allFunctions";
import DepartmentDialog from "@/Forms/DepartmentDialog";
import { EmployeeFormDialogProps, EmployeeDepartment } from "@/types/index";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/hooks/hook";
import { getDepartment } from "@/redux-toolkit/slice/allPage/departmentSlice";
import { socket } from "@/socket/socket";

export const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  open,
  onClose,
  isEditMode = false,
  initialData,
  setEmployeeListRefresh,
  selectedDepartmentName
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [formStep, setFormStep] = useState(1);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  // const [categories, setCategories] = useState<EmployeeDepartment[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Previews
  const [imagePreview, setImagePreview] = useState("");
  const [salarySlipPreview, setSalarySlipPreview] = useState("");
  const [aadhaarPreview, setAadhaarPreview] = useState("");
  const [panPreview, setPanPreview] = useState("");
  const [bankPreview, setBankPreview] = useState("");
  const [departmentRefresh, setDepartmentRefresh] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLInputElement>(null);
  const salarySlipRef = useRef<HTMLInputElement>(null);
  const aadhaarRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<HTMLInputElement>(null);
  const bankRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef(null);
  const formRef = useRef(null);
  const [showArrow, setShowArrow] = useState(true);
  const dispatch = useAppDispatch();
  const categories = useAppSelector((state) => state.department.departments);

  const handleScroll = () => {
    const el = formRef.current;

    const isBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 2;

    setShowArrow(!isBottom);
  };


  // Fetch departments
  const handleGetDepartment = async () => {
    try {
      const data = await getDepartments(user?.companyId?._id);
      // setCategories(data || []);
      dispatch(getDepartment(data || []));
      setDepartmentRefresh(false);
    } catch (err: any) {
      console.error("Error fetching departments:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to load departments",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (selectedDepartmentName) {
      setCurrentEmployee((prev) => ({ ...prev, department: selectedDepartmentName }));
    }
  }, [selectedDepartmentName]);


  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setCurrentEmployee({ ...initialData });
    } else {
      setCurrentEmployee(null);
    }
  }, [initialData]);

  useEffect(() => {
    if (user?.role === "admin" && (categories.length === 0 || departmentRefresh)) {
      handleGetDepartment();
    }
  }, [user, departmentRefresh]);

  useEffect(() => {
    if (!open) return;

    // Reset previews when dialog opens
    setImagePreview(initialData?.profileImage || "");
    setSalarySlipPreview(initialData?.documents?.SalarySlip?.url || "");
    setAadhaarPreview(initialData?.documents?.Aadhaar?.url || "");
    setPanPreview(initialData?.documents?.PAN?.url || "");
    setBankPreview(initialData?.documents?.BankPassbook?.url || "");

    setFormStep(1);
  }, [open, initialData]);

  // Scroll indicator logic
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

    const isScrollable = scrollHeight > clientHeight + 30;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 40;

    setShowScrollIndicator(isScrollable && !isNearBottom);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const timer = setTimeout(checkScroll, 100);
    container.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    return () => {
      container.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      clearTimeout(timer);
    };
  }, [formStep, currentEmployee, open]);

  const resetForm = () => {
    setCurrentEmployee(null);
    setFormStep(1);
    setImagePreview("");
    setSalarySlipPreview("");
    setAadhaarPreview("");
    setPanPreview("");
    setBankPreview("");
    setShowScrollIndicator(false);
  };

  // File handlers
  const handleFileProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurrentEmployee((prev: any) => ({ ...prev, profileImage: file }));

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "SalarySlip" | "Aadhaar" | "PAN" | "BankPassbook",
    setPreview: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurrentEmployee((prev: any) => ({
      ...prev,
      documents: {
        ...prev?.documents,
        [field]: { url: file, fileName: file.name, fileType: file.type },
      },
    }));

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview("PDF_SELECTED");
    }
  };

  // Form submission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const requiredFields = [
        { key: "fullName", label: "Full Name" },
        { key: "email", label: "Email" },
        { key: "department", label: "Department" },
        { key: "designation", label: "Designation" },
        { key: "contact", label: "Contact Number" },
        { key: "joinDate", label: "Join Date" },
        { key: "monthSalary", label: "Monthly Salary" },
        { key: "employeeType", label: "Employee Type" },
        { key: "lpa", label: "LPA" },
      ];

      const missing = requiredFields.find(
        ({ key }) => !currentEmployee?.[key] || String(currentEmployee[key]).trim() === ""
      );

      if (missing) {
        toast({
          title: "Validation Error",
          description: `${missing.label} is required`,
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      formData.append("userId", user?._id || "");
      formData.append("companyId", user?.companyId?._id || "");
      if (!isEditMode) formData.append("password", currentEmployee?.password || "");
      formData.append("id", currentEmployee?.id || "");
      formData.append("fullName", currentEmployee?.fullName || "");
      formData.append("email", currentEmployee?.email || "");
      formData.append("department", currentEmployee?.department || "");
      formData.append("designation", currentEmployee?.designation || "");
      formData.append("remarks", currentEmployee?.remarks || "");
      formData.append("contact", currentEmployee?.contact || "");
      formData.append("joinDate", currentEmployee?.joinDate || "");
      formData.append("monthSalary", String(currentEmployee?.monthSalary || 0));
      formData.append("employeeType", currentEmployee?.employeeType || "");
      formData.append("roleResponsibility", currentEmployee?.roleResponsibility || "");
      formData.append("lpa", String(currentEmployee?.lpa || 0));

      if (currentEmployee?.profileImage instanceof File) {
        formData.append("profileImage", currentEmployee.profileImage);
      }

      if (currentEmployee?.documents?.Aadhaar?.url instanceof File) {
        formData.append("aadhaar", currentEmployee.documents.Aadhaar.url);
      } else if (typeof currentEmployee?.documents?.Aadhaar?.url === "string" && currentEmployee?.documents?.Aadhaar?.url !== "") {
        formData.append("aadhaar", currentEmployee.documents.Aadhaar.url);
      }

      if (currentEmployee?.documents?.PAN?.url instanceof File) {
        formData.append("panCard", currentEmployee.documents.PAN.url);
      } else if (typeof currentEmployee?.documents?.PAN?.url === "string" && currentEmployee?.documents?.PAN?.url !== "") {
        formData.append("panCard", currentEmployee.documents.PAN.url);
      }

      if (currentEmployee?.documents?.BankPassbook?.url instanceof File) {
        formData.append("bankPassbook", currentEmployee.documents.BankPassbook.url);
      }

      if (currentEmployee?.documents?.SalarySlip?.url instanceof File) {
        formData.append("salarySlip", currentEmployee.documents.SalarySlip.url);
      }

      let response;

      if (isEditMode) {
        response = await updateEmployees(currentEmployee?._id, formData);
        toast({ title: "Success", description: "Employee updated successfully" });
      } else {
        response = await addEmployees(formData)
        toast({ title: "Success", description: "Employee added successfully" });
      }

      setEmployeeListRefresh(true);
      socket.emit("addEmployeeRefresh");
      onClose();
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ──────────────────────────────────────────────
  //                  RENDER
  // ──────────────────────────────────────────────

  return (
    <>
      <DepartmentDialog
        isOpen={isDialogOpen}
        setIsOpen={() => { setIsDialogOpen(false) }}
        setDepartmentRefresh={setDepartmentRefresh}
        initialData={null}
        mode={false}
      />

      <Dialog
        open={open}
        onOpenChange={(val) => {
          if (!val) {
            onClose();
            resetForm();
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-[420px] sm:max-w-lg md:max-w-xl p-0 gap-0">
          <form onSubmit={handleSave} className="flex flex-col max-h-[92vh] h-full relative">
            {/* Scrollable area */}
            <div
              ref={formRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto scrollbar-hide px-4 py-5 sm:px-6 sm:py-6 relative"
              style={{ paddingBottom: formStep === 2 ? "10px" : "24px" }}
            >
              <DialogHeader className="pb-4 sm:pb-5">
                <DialogTitle className="text-lg sm:text-xl md:text-2xl">
                  {isEditMode ? "Edit Employee" : "Add New Employee"}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm mt-1">
                  Step {formStep} of 2 • {formStep === 1 ? "Basic Details" : "Employment & Documents"}
                </DialogDescription>
              </DialogHeader>

              {/* Scroll indicator */}
              <div
                className={`absolute ${formStep === 1 ? "bottom-10" : "bottom-[72px]"} left-0 right-0 h-16 pointer-events-none flex items-end justify-center transition-opacity duration-300 z-10 ${showScrollIndicator ? "opacity-70" : "opacity-0"
                  }`}
              >

                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
                <ChevronDown className="text-muted-foreground animate-bounce" size={24} />
              </div>

              {/* STEP 1 */}
              {formStep === 1 && (
                <div className="space-y-4 sm:space-y-5 pb-6">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Full Name *</Label>
                    <Input
                      className="h-9 sm:h-10 text-sm"
                      value={currentEmployee?.fullName || ""}
                      onChange={(e) => setCurrentEmployee({ ...currentEmployee, fullName: e.target.value })}
                      placeholder="Amit Kumar Sharma"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Email *</Label>
                      <Input
                        type="email"
                        className="h-9 sm:h-10 text-sm"
                        value={currentEmployee?.email || ""}
                        onChange={(e) => setCurrentEmployee({ ...currentEmployee, email: e.target.value })}
                        placeholder="amit@example.com"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Password {isEditMode ? "" : "*"}</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={isEditMode ? "" : currentEmployee?.password || ""}
                          disabled={isEditMode}
                          onChange={(e) => setCurrentEmployee({ ...currentEmployee, password: e.target.value })}
                          placeholder={isEditMode ? "••••••••" : "Enter password"}
                          className={`h-9 sm:h-10 text-sm pr-10 ${isEditMode ? "bg-muted cursor-not-allowed" : ""}`}
                        />
                        {!isEditMode && (
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                      </div>
                      {isEditMode && (
                        <p className="text-xs text-muted-foreground">Password cannot be changed in edit mode</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Department */}

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Department *</Label>

                      <Select
                        value={currentEmployee?.department || ""}
                        onValueChange={(val) =>
                          setCurrentEmployee({ ...currentEmployee, department: val })
                        }
                        disabled={categories?.length === 0}
                      >
                        <SelectTrigger className="h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>

                        {categories?.length > 0 && (
                          <SelectContent className="max-h-48 overflow-y-auto">
                            {categories.map((dept) => (
                              <SelectItem key={dept._id} value={dept.name}>
                                {dept.name}
                              </SelectItem>
                            ))}

                            <div className="border-t my-1" />

                            <button
                              type="button"
                              onClick={() => { setIsDialogOpen(true) }}
                              className="w-full text-left px-2 py-1.5 text-sm text-primary hover:bg-muted rounded-sm"
                            >
                              + Add New Department
                            </button>
                          </SelectContent>
                        )}
                      </Select>

                      {categories?.length === 0 && (
                        <div className="flex items-center justify-between text-xs text-red-500">
                          <span>Please add department first</span>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => { setIsDialogOpen(true) }}
                            className="h-7 px-3 text-xs"
                          >
                            + Add Department
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Designation */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Designation *</Label>
                      <Input
                        className="h-9 sm:h-10 text-sm"
                        value={currentEmployee?.designation || ""}
                        onChange={(e) => setCurrentEmployee({ ...currentEmployee, designation: e.target.value })}
                        placeholder="Software Developer"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Contact */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Contact *</Label>
                      <Input
                        className="h-9 sm:h-10 text-sm"
                        type="text"
                        value={currentEmployee?.contact || ""}
                        onChange={(e) => { const onlyDigits = e.target.value.replace(/\D/g, ""); setCurrentEmployee({ ...currentEmployee, contact: onlyDigits }) }}
                        placeholder="9876543210"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        required
                      />
                    </div>

                    {/* Monthly Salary */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Monthly Salary *</Label>
                      <Input
                        type="number"
                        className="h-9 sm:h-10 text-sm"
                        value={currentEmployee?.monthSalary ?? ""}
                        onChange={(e) => setCurrentEmployee({ ...currentEmployee, monthSalary: (e.target.value) })}
                        placeholder="48000"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Joining Date */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Joining Date *</Label>
                      <Input
                        type="date"
                        ref={dateRef}
                        disabled={isEditMode}
                        value={formatDateFromInput(currentEmployee?.joinDate) || ""}
                        onChange={(e) => setCurrentEmployee({ ...currentEmployee, joinDate: e.target.value })}
                        className="h-9 sm:h-10 text-sm"
                        required
                        onClick={() => {
                          if (dateRef.current?.showPicker) {
                            dateRef.current.showPicker();
                          }
                        }}
                      />
                    </div>

                    {/* Profile Image */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Profile Image (Optional)</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        ref={profileRef}
                        onChange={(e) => handleFileProfileChange(e)}
                        className="h-9 sm:h-10 text-sm file:mr-3 file:py-1 file:px-3 file:border-0 file:text-xs file:bg-muted file:text-muted-foreground hover:file:bg-muted/80"
                      />
                      {imagePreview && (
                        <div className="relative w-20 h-20 mt-1.5 rounded-md overflow-hidden border">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentEmployee({ ...currentEmployee, profileImage: undefined });
                              setImagePreview("");
                              if (profileRef.current) profileRef.current.value = "";
                            }}
                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 shadow-sm"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {showArrow && <div className="relative w-full top-[-60px]">
                    <span className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 flex justify-center">
                      <ChevronDown className="w-5 h-5 text-gray-400 animate-bounce" />
                    </span>
                  </div>}



                  <div className="flex justify-end gap-3 pt-5 border-t mt-4">
                    <Button type="button" variant="outline" size="sm" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setFormStep(2)}
                      disabled={
                        !currentEmployee?.fullName ||
                        !currentEmployee?.email ||
                        !currentEmployee?.department ||
                        !currentEmployee?.designation ||
                        !currentEmployee?.contact ||
                        !currentEmployee?.joinDate
                      }
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {formStep === 2 && (
                <div className="space-y-4 sm:space-y-5 pb-5">
                  <div className="grid grid-cols-1  gap-4">
                    {/* Employee Type */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Employee Type</Label>
                      <Select
                        value={currentEmployee?.employeeType?.toLowerCase() || ""}
                        onValueChange={(val) => setCurrentEmployee({ ...currentEmployee, employeeType: val })}
                      >
                        <SelectTrigger className="h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="permanent">Permanent</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="intern">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Role & Responsibilities */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Role & Responsibilities (Optional)</Label>
                    <textarea
                      rows={3}
                      className="w-full border rounded-md p-2.5 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={currentEmployee?.roleResponsibility || ""}
                      onChange={(e) => setCurrentEmployee({ ...currentEmployee, roleResponsibility: e.target.value })}
                      placeholder="Enter key responsibilities (Optional)"
                    />
                  </div>

                  {/* LPA */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">LPA (Last Year Package) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      className="h-9 sm:h-10 text-sm"
                      value={currentEmployee?.lpa || ""}
                      onChange={(e) => setCurrentEmployee({ ...currentEmployee, lpa: Number(e.target.value) })}
                      placeholder="7.2"
                      required
                    />
                  </div>

                  {/* Documents */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium block">Documents (Optional)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FileInput
                        label="Salary Slip"
                        ref={salarySlipRef}
                        file={currentEmployee?.salarySlip || currentEmployee?.documents?.SalarySlip?.url}
                        preview={salarySlipPreview}
                        setPreview={setSalarySlipPreview}
                        onChange={(e) => handleFileChange(e, "SalarySlip", setSalarySlipPreview)}
                      />
                      <FileInput
                        label="Aadhaar Card"
                        ref={aadhaarRef}
                        file={currentEmployee?.documents?.Aadhaar?.url}
                        preview={aadhaarPreview}
                        setPreview={setAadhaarPreview}
                        onChange={(e) => handleFileChange(e, "Aadhaar", setAadhaarPreview)}
                        allowText={true}
                        textValue={typeof currentEmployee?.documents?.Aadhaar?.url === "string" ? currentEmployee?.documents?.Aadhaar?.url : ""}
                        onTextChange={(val) => {
                          setCurrentEmployee((prev: any) => ({
                            ...prev,
                            documents: {
                              ...prev?.documents,
                              Aadhaar: { ...prev?.documents?.Aadhaar, url: val }
                            }
                          }));
                        }}
                      />
                      <FileInput
                        label="PAN Card"
                        ref={panRef}
                        file={currentEmployee?.documents?.PAN?.url}
                        preview={panPreview}
                        setPreview={setPanPreview}
                        onChange={(e) => handleFileChange(e, "PAN", setPanPreview)}
                        allowText={true}
                        textValue={typeof currentEmployee?.documents?.PAN?.url === "string" ? currentEmployee?.documents?.PAN?.url : ""}
                        onTextChange={(val) => {
                          setCurrentEmployee((prev: any) => ({
                            ...prev,
                            documents: {
                              ...prev?.documents,
                              PAN: { ...prev?.documents?.PAN, url: val }
                            }
                          }));
                        }}
                      />
                      <FileInput
                        label="Bank Passbook"
                        ref={bankRef}
                        file={currentEmployee?.documents?.BankPassbook?.url}
                        preview={bankPreview}
                        setPreview={setBankPreview}
                        onChange={(e) => handleFileChange(e, "BankPassbook", setBankPreview)}
                        allowText={true}
                        textValue={
                          typeof currentEmployee?.documents?.BankPassbook?.url === "string"
                            ? currentEmployee?.documents?.BankPassbook?.url
                            : ""
                        }
                        onTextChange={(val) => {
                          setCurrentEmployee((prev: any) => ({
                            ...prev,
                            documents: {
                              ...prev?.documents,
                              BankPassbook: {
                                ...prev?.documents?.BankPassbook,
                                url: val
                              }
                            }
                          }));
                        }}
                      />
                    </div>
                  </div>

                  {/* Remark */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Remark (Optional)</Label>
                    <textarea
                      rows={3}
                      className="w-full border rounded-md p-2.5 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={currentEmployee?.remarks || ""}
                      onChange={(e) => setCurrentEmployee({ ...currentEmployee, remarks: e.target.value })}
                      placeholder="Describe key responsibilities, if any (Optional)"
                    />
                  </div>
                  {showArrow && <div className="relative w-full top-[-350px]">
                    <span className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 flex justify-center">
                      <ChevronDown className="w-5 h-5 text-gray-400 animate-bounce" />
                    </span>
                  </div>}

                  <div className="flex justify-between pt-5 border-t mt-4 sticky bottom-0 bg-background z-20">
                    <Button type="button" variant="outline" size="sm" onClick={() => setFormStep(1)}>
                      ← Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading || !currentEmployee?.employeeType || !currentEmployee?.lpa}
                      size="sm"
                      className="min-w-[140px] flex items-center gap-2"
                    >
                      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isLoading
                        ? isEditMode
                          ? "Updating..."
                          : "Submitting..."
                        : isEditMode
                          ? "Update Employee"
                          : "Submit Employee"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

// FileInput component remains the same
interface FileInputProps {
  label: string;
  ref: React.Ref<HTMLInputElement>;
  file: any;
  preview: string;
  setPreview: React.Dispatch<React.SetStateAction<string>>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allowText?: boolean;
  textValue?: string;
  onTextChange?: (value: string) => void;
}

const FileInput: React.FC<FileInputProps> = ({ label, ref, file, preview, setPreview, onChange, allowText, textValue, onTextChange }) => {
  const [useText, setUseText] = useState(false);

  useEffect(() => {
    if (textValue && !file && allowText) {
      setUseText(true);
    }
  }, [textValue, file, allowText]);

  return (
    <div className="space-y-1 relative">
      <div className="flex items-center justify-between">
        <Label className="text-xs sm:text-sm text-muted-foreground">{label}</Label>
        {allowText && (
          <button
            type="button"
            onClick={() => setUseText(!useText)}
            className="text-[10px] text-primary hover:underline"
          >
            {useText ? "Upload File" : "Enter Number"}
          </button>
        )}
      </div>

      {useText ? (
        <Input
          type="text"
          className="h-9 sm:h-10 text-sm"
          placeholder={`Enter ${label} number`}
          value={textValue || ""}
          onChange={(e) => onTextChange?.(e.target.value)}
        />
      ) : (
        <Input type="file" accept=".pdf,image/*" ref={ref} onChange={onChange} />
      )}

      {!useText && preview && (
        <div className="relative w-24 h-24 mt-1 border rounded overflow-hidden">
          {preview === "PDF_SELECTED" || file?.type === "application/pdf" ? (
            <div className="flex items-center justify-center w-full h-full bg-gray-100 text-sm text-gray-600 font-medium">
              PDF
            </div>
          ) : (
            <img src={preview} alt={`${label} Preview`} className="w-full h-full object-cover" />
          )}
          <button
            type="button"
            className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 shadow-sm"
            onClick={() => {
              setPreview("");
              if (ref && "current" in ref && ref.current) ref.current.value = "";
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};


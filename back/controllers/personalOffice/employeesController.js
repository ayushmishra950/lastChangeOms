const { Employee } = require("../../models/personalOffice/employeeModel.js"); // adjust path if needed
const uploadToCloudinary = require("../../cloudinary/uploadToCloudinary.js");
const { EmployeeHistory } = require("../../models/personalOffice/EmployeeHistoryModel.js");
const { Admin } = require("../../models/personalOffice/authModel.js");
const bcrypt = require("bcryptjs");
const recentActivity = require("../../models/personalOffice/recentActivityModel.js");
const Task = require("../../models/personalOffice/taskModel.js");
const SubTask = require("../../models/personalOffice/SubtaskModel.js");
const Company = require("../../models/personalOffice/companyModel.js");
const mongoose = require("mongoose");
// ---------------- Add Employee Controller ----------------

const addEmployee = async (req, res) => {
  try {
    const files = req.files;

    const {
      fullName,
      email,
      department,
      designation,
      contact,
      monthSalary,
      joinDate,
      employeeType,
      roleResponsibility,
      lpa,
      remarks,
      password,
      companyId,
      userId
    } = req.body;

    // 🔐 Get adminId & companyId from token (NOT frontend)
    // const adminId = req.user.id;
    // const companyId = req.user.companyId;
    // Required fields validation
    if (!fullName || !email || !department || !designation || !contact || !joinDate || !password) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Check if employee already exists (company wise)
    const exists = await Employee.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Employee already exists" });
    }

    // 🔐 Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Upload helper
    const upload = async (file) =>
      file ? await uploadToCloudinary(file.buffer) : "";


    // Create employee
    const employee = new Employee({
      fullName,
      email,
      password: hashedPassword,   // 🔐 hashed password
      contact,
      department,
      designation,
      roleResponsibility: roleResponsibility || "",
      employeeType: employeeType || "permanent",
      joinDate,
      monthSalary: Number(monthSalary || 0),
      lpa: Number(lpa || 0),
      remarks: remarks || "",
      // 🔐 company isolation
      createdBy: companyId,          // 🔐 admin who created

      profileImage: await upload(files?.profileImage?.[0]),
      documents: {
        salarySlip: await upload(files?.salarySlip?.[0]),
        aadhaar: (await upload(files?.aadhaar?.[0])) || req.body.aadhaar || "",
        panCard: (await upload(files?.panCard?.[0])) || req.body.panCard || "",
        bankPassbook: await upload(files?.bankPassbook?.[0] || req.body.bankPassbook || ""),
        ifscCode: (req.body.ifscCode || ""),
      },
    });

    await employee.save();
    await recentActivity.create({ title: "New Employee Added.", createdBy: userId, createdByRole: "Admin", companyId: companyId })

    return res.status(201).json({
      message: "Employee added successfully",
      employee,
    });

  } catch (err) {
    console.error("Add Employee Error:", err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Employee with this email already exists",
        field: "email",
      });
    }

    if (err.name === "CastError") {
      return res.status(400).json({
        message: "Invalid employee ID",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


// ----------------update Reliveve Employee----------
const updateEmployeeStatus = async (req, res) => {
  const { adminId, employeeId, companyId, status } = req.body;
  try {
    const company = await Company.findOne({ _id: companyId });
    if (!company) return res.status(404).json({ message: "Company Not Found." });
    const admin = await Admin.findOne({ _id: adminId, companyId });
    if (!admin) return res.status(404).json({ message: "Admin Not FOund." });
    const employee = await Employee.findOne({ _id: employeeId, createdBy: companyId });
    if (!employee) return res.status(404).json({ message: "Employee Not Found." });

    employee.status = status;
    employee.relievingDate = null;
    employee.save();
    res.status(200).json({ message: "Employee Status Active Successfully." });

  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: `Error- ${err?.message}` })
  }
}

// ---------------- Get All Employees ----------------

const getEmployees = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId || companyId === "undefined") {
      return res.status(400).json({ message: "Company ID is required" });
    }

    // ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ message: "Invalid Company ID" });
    }

    const employees = await Employee.find({
      createdBy: companyId
    }).sort({ createdAt: -1 });

    if (employees.length === 0) {
      return res.status(404).json({ message: "Employee Not Found." });
    }

    return res.status(200).json(employees);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message }); // better debugging
  }
};

// ---------------- Get Employee by ID ----------------
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;
    let task = null;

    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const employee = await Employee.findOne({ _id: id, createdBy: companyId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found or access denied" });
    }

    if (employee?.taskRole === "manager") {
      task = await Task.find({ companyId, managerId: employee?._id })
    }
    else {
      task = await SubTask.find({ companyId, employeeId: employee?._id });
    }

    const history = await EmployeeHistory.find({ employeeId: id })
      .populate({
        path: "changedBy", populate: {
          path: "admins", select: "username"
        }
      })
      .sort({ effectiveDate: -1 });

    return res.status(200).json({ employee, history, task });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Update Employee ----------------
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const files = req.files;

    if (!id) {
      return res.status(400).json({ message: "Employee ID is required" });
    }

    if (!updates?.companyId) {
      return res.status(403).json({ message: "you did not have permission to changes." });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (updates.password) {
      // Check if new password is same as current password
      const isSame = await bcrypt.compare(updates.password, employee.password || "");
      if (isSame) {
        return res.status(400).json({ message: "New password cannot be same as old password." });
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(updates.password, salt);
      updates.password = hashedPassword;
    }

    // 🔹 Cloudinary helper
    const upload = async (file) =>
      file ? await uploadToCloudinary(file.buffer) : null;

    const historyEntries = [];

    const logHistory = (eventType, oldData, newData, remarks = "") => {
      historyEntries.push({
        employeeId: id,
        eventType,
        oldData,
        newData,
        remarks,
        changedBy: null
      });
    };

    /* =========================
       🔁 SALARY CHANGE
    ========================= */
    if (
      updates.monthSalary &&
      Number(updates.monthSalary) !== employee.monthSalary
    ) {
      logHistory(
        "SALARY_CHANGE",
        { monthSalary: employee.monthSalary },
        { monthSalary: updates.monthSalary },
        "Salary updated"
      );
    }

    /* =========================
       🔁 DEPARTMENT CHANGE
    ========================= */
    if (updates.department && updates.department !== employee.department) {
      logHistory(
        "DEPARTMENT_CHANGE",
        { department: employee.department },
        { department: updates.department }
      );
    }

    /* =========================
       🔁 PROFILE CHANGE
    ========================= */
    if (updates.designation && updates.designation !== employee.designation) {
      logHistory(
        "PROFILE_UPDATE",
        { designation: employee.designation },
        { designation: updates.designation }
      );
    }

    /* =========================
       📁 FILE UPDATES (Cloudinary)
    ========================= */
    // const documentUpdates = {};

    // if (files?.profileImage?.[0]) {
    //   const newImg = await upload(files.profileImage[0]);
    //   documentUpdates.profileImage = newImg;

    //   logHistory(
    //     "DOCUMENT_UPDATE",
    //     { profileImage: employee.profileImage },
    //     { profileImage: newImg },
    //     "Profile image updated"
    //   );
    // }

    // if (files?.aadhaar?.[0]) {
    //   const aadhaar = await upload(files.aadhaar[0]);
    //   documentUpdates["documents.aadhaar"] = aadhaar;
    // } else if (req.body.aadhaar) {
    //   documentUpdates["documents.aadhaar"] = req.body.aadhaar;
    // }

    // if (files?.panCard?.[0]) {
    //   const pan = await upload(files.panCard[0]);
    //   documentUpdates["documents.panCard"] = pan;
    // } else if (req.body.panCard) {
    //   documentUpdates["documents.panCard"] = req.body.panCard;
    // }

    // if (files?.bankPassbook?.[0]) {
    //   const bank = await upload(files.bankPassbook[0]);
    //   documentUpdates["documents.bankPassbook"] = bank;
    // }

    // if (files?.salarySlip?.[0]) {
    //   const slip = await upload(files.salarySlip[0]);
    //   documentUpdates["documents.salarySlip"] = slip;
    // }


    /* =========================
   📁 FILE & DOCUMENT UPDATES (Cloudinary + Strings + ifscCode)
========================= */
    const documentUpdates = {};

    // Helper for uploading or taking string value
    const uploadOrValue = async (file, value) => {
      if (file) return await upload(file);
      if (value) return value;
      return "";
    };

    // Profile Image
    if (files?.profileImage?.[0]) {
      const newImg = await upload(files.profileImage[0]);
      documentUpdates.profileImage = newImg;
      logHistory(
        "DOCUMENT_UPDATE",
        { profileImage: employee.profileImage },
        { profileImage: newImg },
        "Profile image updated"
      );
    }

    // Aadhaar
    documentUpdates["documents.aadhaar"] = await uploadOrValue(
      files?.aadhaar?.[0],
      req.body.aadhaar
    );

    // Pan Card
    documentUpdates["documents.panCard"] = await uploadOrValue(
      files?.panCard?.[0],
      req.body.panCard
    );

    // Bank Passbook
    documentUpdates["documents.bankPassbook"] = await uploadOrValue(
      files?.bankPassbook?.[0],
      req.body.bankPassbook
    );

    // Salary Slip
    documentUpdates["documents.salarySlip"] = await uploadOrValue(
      files?.salarySlip?.[0],
      req.body.salarySlip
    );

    // IFSC Code
    documentUpdates["documents.ifscCode"] = req.body.ifscCode || employee.documents?.ifscCode || "";

    if (Object.keys(documentUpdates).length > 0) {
      logHistory(
        "DOCUMENT_UPDATE",
        {},
        Object.keys(documentUpdates),
        "Employee documents updated"
      );
    }

    /* =========================
       🔁 FINAL UPDATE
    ========================= */
    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      {
        ...updates,
        ...documentUpdates,
      },
      { new: true }
    );

    if (historyEntries.length > 0) {
      await EmployeeHistory.insertMany(historyEntries);
    }

    return res.status(200).json({
      message: "Employee updated successfully",
      employee: updatedEmployee,
    });
  } catch (err) {
    console.error("Update Employee Error:", err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Email already exists for another employee",
        field: "email",
      });
    }

    if (err.name === "CastError") {
      return res.status(400).json({
        message: "Invalid employee ID",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }

};














// // ---------------- Delete Employee ----------------
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(403).json({ message: "You do not have permission to delete this employee." });
    }

    const deletedEmployee = await Employee.findOneAndDelete({ _id: id, createdBy: companyId });
    if (!deletedEmployee) {
      return res.status(404).json({ message: "Employee not found or access denied" });
    }

    return res.status(200).json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};



// ---------------- Relieve Employee ----------------

const relieveEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { relievingDate, remarks, companyId } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Employee ID is required" });
    }
    if (!companyId) {
      return res.status(400).json({ message: "companyId  is required" });
    }
    const employee = await Employee.findByIdAndUpdate({ _id: id, createdBy: companyId });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (employee.status === "RELIEVED") {
      return res.status(400).json({ message: "Employee is already relieved" });
    }

    // Update employee status
    employee.status = "RELIEVED";
    employee.relievingDate = relievingDate
      ? new Date(relievingDate)
      : new Date();

    if (remarks) {
      employee.remarks = remarks;
    }

    await employee.save();

    await EmployeeHistory.create({
      employeeId: employee._id,
      eventType: "RELIEVED",
      oldData: { status: "ACTIVE" },
      newData: { status: "RELIEVED" },
      remarks: remarks || "Employee relieved",
      changedBy: companyId
    });

    return res.status(200).json({
      message: "Employee relieved successfully",
      employee,
    });
  } catch (err) {
    console.error("Relieve Employee Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// Export all functions
module.exports = {
  addEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  relieveEmployee,
  relieveEmployee,
  updateEmployeeStatus
};

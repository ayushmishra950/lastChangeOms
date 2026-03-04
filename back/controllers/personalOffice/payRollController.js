const PayRoll = require("../../models/personalOffice/payRollModel.js");
const Department = require("../../models/personalOffice/departmentModel.js");
const Company = require("../../models/personalOffice/companyModel.js"); // company model
const { EmployeeHistory } = require("../../models/personalOffice/EmployeeHistoryModel.js");
const { Employee } = require("../../models/personalOffice/employeeModel.js"); // adjust path if needed

// Admin: Create a new salary record
const createSalary = async (req, res) => {
  try {
    const { employeeId, month, year, basic, allowance, deductions, departmentName, companyId } = req.body;

    // 1️⃣ Validation
    if (!employeeId || !month || !year || basic == null || allowance == null || deductions == null || !departmentName || !companyId) {
      return res.status(400).json({ message: "All fields including companyId are required" });
    }

    // 2️⃣ Check if company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    const employee = await Employee.findOne({ _id: employeeId, createdBy: companyId });
    if (!employee) return res.status(404).json({ message: "Employee Not Found." })

    if (employee?.status === "RELIEVED") return res.status(403).json({ message: "Employee has already been relieved from the company." })

    // 3️⃣ Find department by name
    const department = await Department.findOne({ name: departmentName.trim() });
    if (!department) {
      return res.status(404).json({ message: `Department "${departmentName}" not found` });
    }

    // 4️⃣ Create salary record
    const newSalary = new PayRoll({
      employeeId,
      month,
      year,
      basic,
      allowance,
      deductions,
      departmentId: department._id,
      createdBy: company._id, // save company reference
    });

    const savedSalary = await newSalary.save();

    // 5️⃣ Log salary history
    if (employee) {
      const oldSalary = employee.monthSalary || 0; // previous salary
const basicNum = parseFloat(basic) || 0;
const allowanceNum = parseFloat(allowance) || 0;
const deductionsNum = parseFloat(deductions) || 0;

const newMonthSalary = basicNum + allowanceNum - deductionsNum;
      // Only log if salary changed
      if (oldSalary !== newMonthSalary) {
        await EmployeeHistory.create({
          employeeId,
          eventType: "SALARY_CHANGE",
          oldData: { monthSalary: oldSalary },
          newData: { monthSalary: newMonthSalary },
          remarks: `Salary created for ${month}-${year}`,
          changedBy: company._id, // the company/admin who made the change
        });
      }

      // Optionally, update employee's monthSalary field
      employee.monthSalary = newMonthSalary;
      await employee.save();
    }


    res.status(201).json({
      message: "Salary slip created successfully",
      data: savedSalary,
    });
  } catch (err) {
    console.error("Create Salary Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Get all salary records (company-wise)
const getAllSalaries = async (req, res) => {
  try {
    const { companyId } = req.query; // frontend can send companyId in query

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const salaries = await PayRoll.find({ createdBy: companyId })
      .populate("departmentId")
      .populate("employeeId", "fullName")
      .sort({ createdAt: -1 });

    res.status(200).json(salaries);
  } catch (err) {
    console.error("Get All Salaries Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Employee & Admin: Get salary by employeeId (company-wise)
const getSalaryByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { companyId } = req.query; // frontend pass companyId as query param

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const salaries = await PayRoll.find({ employeeId, createdBy: companyId })
      .populate("departmentId", "name")
      .populate("employeeId", "fullName")
      .sort({ createdAt: -1 });

    if (!salaries.length) {
      return res.status(404).json({ message: "No salary records found" });
    }

    res.status(200).json(salaries);
  } catch (err) {
    console.error("Get Salary By Employee Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createSalary,
  getAllSalaries,
  getSalaryByEmployee
};

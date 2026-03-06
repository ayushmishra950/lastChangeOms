const { Server } = require("socket.io");
const Notification = require("./models/personalOffice/NotificationModel"); // Notification model
const { Employee } = require("./models/personalOffice/employeeModel"); // adjust path if needed

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      // origin: "https://lastchangeoms-frontend.onrender.com",
      origin:"http://localhost:8080",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("joinRoom", (roomId) => {
      socket.join(roomId?.toString());
      console.log(`${socket.id} joined room: ${roomId}`);
    });

    socket.on("addProjectRefresh", (projectId) => {
      // same room me sabko notify karo
      io.emit("getProjectRefresh");
    });

    socket.on("addTaskRefresh", () => {
      // same room me sabko notify karo
      io.emit("getTaskRefresh");
    });

    socket.on("addSubTaskRefresh", () => {
      // same room me sabko notify karo
      io.emit("getSubTaskRefresh");
    });
    socket.on("addEmployeeRefresh", () => {
      // same room me sabko notify karo
      io.emit("getEmployeeRefresh");
    });

    socket.on("addLeaveRefresh", () => {
      // same room me sabko notify karo
      io.emit("getLeaveRefresh");
    });
    socket.on("addAttendanceRefresh", () => {
      // same room me sabko notify karo
      io.emit("getAttendanceRefresh");
    });
     socket.on("addPayrollRefresh", () => {
      // same room me sabko notify karo
      io.emit("getPayrollRefresh");
    });
    socket.on("addDepartmentRefresh", async(employeeId) => {
      const employeeData = await Employee.findById(employeeId).populate("createdBy", "name logo")
        .select("+password");
      // same room me sabko notify karo
      io.emit("getDepartmentRefresh", employeeData);
    });
    socket.on("addRelieveRefresh", (employeeId) => {
      console.log(employeeId)
      // same room me sabko notify karo
      io.emit("getRelieveRefresh", employeeId);
    });

     socket.on("updateManagerRefreshForFrontend", async({selectedEmployee, oldEmployee}) => {
      // same room me sabko notify karo
      const employeeData = await Employee.findById(selectedEmployee).populate("createdBy", "name logo")
        .select("+password");
         const oldEmployeeData = await Employee.findById(oldEmployee).populate("createdBy", "name logo")
        .select("+password");
      io.emit("updateManagerRefresh", {newManager:employeeData, oldManager:oldEmployeeData});
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}

/**
 * Send notification: save in DB and emit via socket
 * @param {string} userId - User ObjectId
 * @param {string} userModel - "Admin" or "Employee"
 * @param {string} companyId - Company ObjectId
 * @param {string} message - Notification message
 * @param {string} type - "task" | "subtask" | "leave" | "general"
 * @param {string|null} referenceId - Related Task/Leave/Subtask ID
 */


async function sendNotification({ createdBy, userId, userModel, companyId, message, type = "general", referenceId = null }) {
  if (!io) return console.error("Socket.io not initialized");
  console.log(createdBy, userId, userModel, companyId, message, type, referenceId,)
  // if(!createdBy || !userId ||!userModel || !companyId || !message || !type ||  !referenceId) return {message : " required field missing."}

  try {
    // 1️⃣ Save in MongoDB
    const notificationDoc = await Notification.create({
      userId,
      userModel,   // required
      companyId,   // required
      message,
      type,
      referenceId,
      createdBy
    });

    // Populate createdBy for frontend display
    const notification = await notificationDoc.populate("createdBy");


    // 2️⃣ Emit via socket to the user
    io.to(userId.toString()).emit("newNotification", notification);

    console.log("Notification sent:", notification);

  } catch (err) {
    console.error("Send notification error:", err);
  }
}

module.exports = { initSocket, sendNotification };

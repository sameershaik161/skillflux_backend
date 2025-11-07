import express from "express";
import authStudent from "../middlewares/authStudent.js";
import authAdmin from "../middlewares/authAdmin.js";
import { 
  getMyERP, 
  updateERP, 
  submitERP,
  getAllERPs,
  getStudentERP,
  verifyERP,
  updateERPPoints
} from "../controllers/erp.controller.js";

const router = express.Router();

// Student routes
router.get("/my-erp", authStudent, getMyERP);
router.put("/my-erp", authStudent, updateERP);
router.post("/my-erp/submit", authStudent, submitERP);

// Admin routes
router.get("/admin/all", authAdmin, getAllERPs);
router.get("/admin/student/:studentId", authAdmin, getStudentERP);
router.put("/admin/:id/verify", authAdmin, verifyERP);
router.put("/admin/:id/points", authAdmin, updateERPPoints);

export default router;

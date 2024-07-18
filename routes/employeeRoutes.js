const express = require("express");
const employeeController = require("../controllers/employeeController");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect);

router.route("/").get(employeeController.getAllEmployees);
router.post("/absence/:id",
  employeeController.uploadEmployeesDocs,
  employeeController.declareAbs
);
router.post("/salary-validation", employeeController.salaryValidation);
router.post("/fromManager", employeeController.createEmployeeShort)
router
  .route("/:id")
  .post(
    employeeController.uploadEmployeesDocs,
    employeeController.createEmployee
  )
  .get(employeeController.getOneEmployee)
  .patch(employeeController.updateEmployee)
  .delete(employeeController.deleteEmployee);

module.exports = router;

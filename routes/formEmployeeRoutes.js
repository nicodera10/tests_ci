const express = require("express");
const formEmployeeController = require("../controllers/formEmployeeController");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect);

router.route("/").get(formEmployeeController.getAllFormEmployees);
router
  .route("/:id")
  .post(
    formEmployeeController.uploadFormEmployeesDocs,
    formEmployeeController.createFormEmployee
  )
  .get(formEmployeeController.getOneFormEmployee)
  .patch(formEmployeeController.updateFormEmployee)
  .delete(formEmployeeController.deleteFormEmployee);

module.exports = router;

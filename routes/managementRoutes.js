const express = require("express");
const managementController = require("../controllers/managementController");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect);

router
  .route("/")
  .post(managementController.createManagement)
  .get(managementController.getAllEntities);
router.patch(
  "/updateLogo/:id",
  managementController.updateManagementLogo,
  managementController.updateManagement
);
router.patch(
  "/suspend/:id",
  managementController.suspendManagement,
);

router.patch(
  "/reactive/:id",
  managementController.reactiveManagement,
);

router
  .route("/:id")
  .get(managementController.getOneManagement)
  .patch(managementController.updateManagement)
  .delete(managementController.deleteManagement);

module.exports = router;

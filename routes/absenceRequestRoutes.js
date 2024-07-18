const express = require('express');
const absenceRequestController = require('../controllers/absenceRequestController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(absenceRequestController.getAllAbsenceRequests)
  .post(
    absenceRequestController.uploadAbsenceDocs,
    absenceRequestController.submitAbsenceRequest
  );

router
  .route('/:id')
  .get(absenceRequestController.getAbsenceRequest)
  .patch(authController.restrictTo('employer'), absenceRequestController.manageAbsenceRequest)
  .delete(authController.restrictTo('employer'), absenceRequestController.deleteAbsenceRequest);

module.exports = router;

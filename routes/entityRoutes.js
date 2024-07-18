const express = require("express");
const entityController = require("../controllers/entityController");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect);

router
  .route("/")
  .post(entityController.createEntity)
  .get(entityController.getAllEntities);

router.post("/contact", 
  entityController.uploadContactDocs,
  entityController.contact
);

router
  .route("/updateInformations/:id")
  .patch(
    entityController.updateEntityInformations,
    entityController.updateEntity
  );

router
    .route("/addSalaryElements/:id")
    .patch(entityController.addSalaryElements);

router
  .route("/absence/:id")
  .patch(
    entityController.uploadAbsenceDocs,
    entityController.addAbsence
  );

router
  .route("/generatePaySlips/:id")
  .patch(entityController.generatePaySlips);

router
  .route("/:id")
  .get(entityController.getOneEntity)
  .patch(entityController.updateEntity)
  .delete(entityController.deleteEntity);

module.exports = router;

const express = require("express");
const ressourceController = require("../controllers/ressourceController");
const authController = require("../controllers/authController");

const router = express.Router();

router.use(authController.protect);

router.get("/absences", ressourceController.getAllAbsences);

router.get("/primes", ressourceController.getAllPrimes);

module.exports = router;

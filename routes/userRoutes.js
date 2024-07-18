const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router({ mergeParams: true });

router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.post("/signup-client", authController.signupClient);
router.patch("/resetPassword", authController.forgotPassword);

router.use(authController.protect);
router.post("/change-password", authController.updatePassword);
router.post("/init-password", authController.initPassword);
router.get("/me", userController.getMe, userController.getUser);

router.patch("/updateMe", userController.updateMe);

//router.use(authController.restrictTo("admin"));

router.route("/").get(userController.getAllUsers);
router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;

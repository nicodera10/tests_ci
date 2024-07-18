const mongoose = require("mongoose");

const managementSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
    },
    logo: String,
    email: String,
    emailNewCollaborator: String,
    emailDeleteCollaborator: String,
    emailAbsenceCollaborator: String,
    emailSalaryElement: String,
    emailGeneratePaySlip: String,
    emailContact: String,
    newEmployee: { type: Number, default: 0 },
    absence: { type: Number, default: 0 },
    remove: { type: Number, default: 0 },
    salary: { type: Number, default: 0 },
    contact: { type: Number, default: 0 },
    suspended: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);
managementSchema.virtual("entities", {
  ref: "Entity",
  foreignField: "management",
  localField: "_id",
});
const Management = mongoose.model("Management", managementSchema);

module.exports = Management;

const mongoose = require("mongoose");
const entitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
    },
    //allowedUsers: [
    //  {
    //    type: mongoose.Schema.ObjectId,
    //    ref: "User",
    //  },
    //],
    management: {
      type: mongoose.Schema.ObjectId,
      ref: "Management",
      required: [true, "Une entité doit-être rattachée  à un gestionnaire"],
    },
    primes: [{
      code: String,
      name: String,
    }],
    absences: [{
      code: String,
      name: String,
    }],
    suspended: {
      type: Boolean,
      default: false,
    },
    entryPrime: [{
      matricule: String,
      code: String,
      value: Number,
    }],
    entryAbsence: [{
      matricule: String,
      code: String,
      value: Number,
      startDate: String,
      endDate: String,
    }],
    informations: String,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);
entitySchema.pre(/^find/, function (next) {
  this.populate({ path: "management" });
  next();
});
const Entity = mongoose.model("Entity", entitySchema);

module.exports = Entity;

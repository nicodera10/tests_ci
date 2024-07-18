const mongoose = require("mongoose");

const entitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
    },
    management: {
      type: mongoose.Schema.ObjectId,
      ref: "Management",
      required: [true, "Une entité doit être rattachée à un gestionnaire"],
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
    entryAdvance: [{
      employeeId: {
        type: mongoose.Schema.ObjectId,
        ref: "Employee",
        required: [true, "Une avance doit être rattachée à un employé"]
      },
      amount: {
        type: Number,
        required: [true, "Le montant de l'avance est requis"]
      },
      reason: {
        type: String,
        required: [true, "La raison de l'avance est requise"]
      },
      requestDate: {
        type: Date,
        default: Date.now
      },
    }],
    absenceRequests: [{
      employee: {
        type: mongoose.Schema.ObjectId,
        ref: 'Employee',
        required: true,
      },
      absenceCode: {
        type: String,
        required: true,
      },
      absenceName: {
        type: String,
        required: true,
      },
      beginDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
      documents: [
        {
          type: String,
          required: true,
        },
      ],
      status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
      },
      requestDate: {
        type: Date,
        default: Date.now
      },
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

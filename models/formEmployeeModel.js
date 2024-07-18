const mongoose = require("mongoose");
const formEmployeeSchema = new mongoose.Schema(
  {
    civilite: String,
    lastName: {
      type: String,
      required: [true, "Please provide a name"],
    },
    maidenName: String,
    firstName: String,
    birthDate: String,
    country: String,
    county: String,
    ssNumber: String,
    docs: [String],
    houseNumber: String,
    street: String,
    addressSupplement: String,
    zipCode: String,
    city: String,
    mail: String,
    reason: String,
    contractType: String,
    cddType: String,
    dateSigned: String,
    dateBegin: String,
    dateEnd: String,
    trialPeriod: Number,
    weaklyTime: String,
    drawUp: String,
    positionName: String,
    isExecutive: String,
    classification: String,
    // hourlyRate: String,
    salary: String,
    salaryValue: String,
    monthlyPremium: String,
    premiumType: String,
    advantages: String,
    advantageType: String,
    iban: String,
    bic: String,
    mondayMorning: String,
    mondayAfternoon: String,
    tuesdayMorning: String,
    tuesdayAfternoon: String,
    wenesdayMorning: String,
    wenesdayAfternoon: String,
    thursdayMorning: String,
    thursdayAfternoon: String,
    fridayMorning: String,
    fridayAfternoon: String,
    saturdayMorning: String,
    saturdayAfternoon: String,
    sundayMorning: String,
    sundayAfternoon: String,
    healthContract: String,
    alsaceMoselle: String,
    comment: String,
    entity: { type: mongoose.Schema.ObjectId, ref: "Entity" },
    isActive: {
      type: Boolean,
      default: true,
    },
    departureType: String,
    departureToEstablish: String,
    departureDate: String,
    action: String
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);
formEmployeeSchema.pre(/^find/, function (next) {
  this.populate({ path: "entity" });
  next();
});
const FormEmployee = mongoose.model("FormEmployee", formEmployeeSchema);

module.exports = FormEmployee;

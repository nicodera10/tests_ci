const mongoose = require("mongoose");
const ressourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
    },
    type: {
      type: String,
      required: [true, "Please provide a type"],
    },
    code: {
      type: String,
      required: [true, "Please provide a code"],
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

const Ressource = mongoose.model("Ressource", ressourceSchema);

module.exports = Ressource;

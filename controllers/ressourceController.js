const Ressource = require("../models/ressourceModel");
const factory = require("./handlerFactory");


exports.getAllPrimes = async (req, res) => {
    let primes = await Ressource.find({ type: "PRIME" });

    res.status(200).json({
        status: "success",
        data: primes
    });
};

exports.getAllAbsences = async (req, res) => {
    let absences = await Ressource.find({ type: "ABSENCE" });

    res.status(200).json({
        status: "success",
        data: absences
    });
}

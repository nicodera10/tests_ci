


const buildCsvAbsence = (absences) => {
    let content = "Matricule;Code;Valeur;Date dÈbut;Date fin\n"

    absences.forEach(absence => {
        content += `${absence.matricule};${absence.code};${absence.value};${absence.startDate};${absence.endDate}\n`
    });

    return content
}

const buildCsvPrime = (primes, allPrimes) => {
    let content = "Matricule;"
    allPrimes.forEach(p => {
        content += `${p.code};`
    });
    content += "\n"

    let matricules = []
    primes.forEach(prime => {
        if (!matricules.includes(prime.matricule)) {
            matricules.push(prime.matricule)
        }
    });

    matricules.forEach(matricule => {
        content += `${matricule};`

        allPrimes.forEach(p => {
            let prime = primes.filter(prime => prime.matricule === matricule && prime.code === p.code)
            if (prime.length > 0) {
                let sum = 0;
                prime.forEach(el => {
                    sum += el.value;
                });
                content += sum + `;`
            } else {
                content += `;`
            }
        })
        content += "\n"
    });

    return content;
}


module.exports = {
    buildCsvAbsence,
    buildCsvPrime
}
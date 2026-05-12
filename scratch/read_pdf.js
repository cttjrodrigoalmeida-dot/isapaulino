const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('C:/Users/Digo/AppData/Local/Packages/5319275A.WhatsAppDesktop_cv1g1gvanyjgm/LocalState/sessions/E3B98DDB2AE990BF0640C99D87DA639DA1E8276B/transfers/2026-19/PORTFOLIOS.compressed.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(function(err) {
    console.error(err);
});

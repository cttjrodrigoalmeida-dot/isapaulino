const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('C:/Users/Digo/Desktop/Alterações/PORTFOLIOS.compressed.pdf');

function render_page(pageData) {
    let render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false
    }
    return pageData.getTextContent(render_options)
    .then(function(textContent) {
        let lastY, text = '';
        for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY){
                text += item.str + ' ';
            } else {
                text += '\n' + item.str + ' ';
            }
            lastY = item.transform[5];
        }
        return `=== PAGE ${pageData.pageNumber} ===\n${text}\n`;
    });
}

pdf(dataBuffer, { pagerender: render_page }).then(function(data) {
    console.log(data.text);
}).catch(function(err) {
    console.error(err);
});

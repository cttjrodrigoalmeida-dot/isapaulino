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
        let items = textContent.items.map(item => ({
            text: item.str,
            x: Math.round(item.transform[4]),
            y: Math.round(item.transform[5])
        }));
        
        items.sort((a, b) => {
            if (Math.abs(b.y - a.y) > 10) return b.y - a.y; // sort by Y desc
            return a.x - b.x; // sort by X asc
        });
        
        let out = '';
        items.forEach(i => out += `[X:${i.x}, Y:${i.y}] ${i.text}\n`);
        return out;
    });
}

pdf(dataBuffer, { pagerender: render_page }).then(function(data) {
    console.log(data.text);
}).catch(function(err) {
    console.error(err);
});

const all = require('epsg-index/all.json')
const fs = require('fs')
const path = require('path')

const db = {};
Object.keys(all).forEach(code => {
    if (all[code].proj4){
        const proj = all[code].proj4;
        if (proj.indexOf("+nadgrids") !== -1) return;
        
        db[`EPSG:${code}`] = proj;
    }
});
fs.writeFileSync(path.join(__dirname, '..', 'src', 'epsg.json'), JSON.stringify(db));
console.log(`Wrote epsg.json`);
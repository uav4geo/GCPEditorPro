const all = require('epsg-index/all.json')
const fs = require('fs')
const path = require('path')

const db = {};
Object.keys(all).forEach(code => {
    if (all[code].proj4){
        db[`EPSG:${code}`] = all[code].proj4;
    }
});
fs.writeFileSync(path.join(__dirname, '..', 'src', 'epsg.json'), JSON.stringify(db));
console.log(`Wrote epsg.json`);
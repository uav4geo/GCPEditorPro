import { KEYUTIL } from 'jsrsasign';

function validate(productId, license, hintCallback = null):  LicenseInfo{
    const pubkey = `-----BEGIN PUBLIC KEY-----
    MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBANYMD3arHzC5LtLsSSSXaJrNPpld9H17
    VoVtKfGxbtFNiME+3ffgu1srP1nvu4meZCfh+1Bwo1ufKKm/DFjHJ9MCAwEAAQ==
    -----END PUBLIC KEY-----`;

    license = license.split("\n").map(l => l.trim()).join("\n");
    license = license.replace(/^\s*/, "");
    license = license.replace(/\s*$/, "");
    license = license.replace(/=+\s+END\sLICENSE\s+=+/i, "");
    license = license.replace(/=+\s+BEGIN\sLICENSE\s+=+/i, "");
    license = license.trim()
    license = license.replace(/\r\n/g, "\n");
    const lines = license.split("\n").filter(l => l.trim().length > 0);

    // The first line should always contain a "Param: value" string
    // if not, the user likely just copied/paste the numbers from the license.
    if (hintCallback !== null && lines.length > 0 && lines[0].indexOf(":") === -1 && lines[0].split(" ").length >= 4){
        hintCallback(`The license starts with ===== BEGIN LICENSE ===== and ends with ===== END LICENSE =====. It looks like you included only part of it? Make sure to copy all of it, including Name and Quantity labels.`); 
    }

    const data = [`Product: ${productId}`].concat(lines.filter(l => l.indexOf(":") !== -1)).join("\n") + "\n";
    const signature = lines.filter(l => l.indexOf(":") === -1)
                             .map(l => l.replace(/\s/g, "")
                             .toLowerCase()).join("");

    const pubKey = KEYUTIL.getKey(pubkey);
    if (pubKey.verify(data, signature)){
        const res: LicenseInfo = {name: "", quantity: -1, demo: false, dev: false};
        data.split("\n").forEach(l => {
            const [k, v] = l.split(":").map(l => l.trim());
            if (k) res[k.toLowerCase()] = v;
        });
        return res;
    }else return new DemoLicense();
    
}

class LicenseInfo{
    public name: string;
    public quantity: number;
    public demo: boolean;
    public dev: boolean;
}

class DemoLicense implements LicenseInfo{
    name = "";
    quantity = -1;
    demo = true;
    dev = false;
}

class DevLicense implements LicenseInfo{
    name = "";
    quantity = 1;
    demo = false;
    dev = true;
}

export { validate, LicenseInfo, DemoLicense, DevLicense };

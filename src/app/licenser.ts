import { KEYUTIL } from 'jsrsasign';

function validate(productId, license):  LicenseInfo{
    const pubkey = `-----BEGIN PUBLIC KEY-----
    MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBANYMD3arHzC5LtLsSSSXaJrNPpld9H17
    VoVtKfGxbtFNiME+3ffgu1srP1nvu4meZCfh+1Bwo1ufKKm/DFjHJ9MCAwEAAQ==
    -----END PUBLIC KEY-----`;

    license = license.replace(/^\s*/, "");
    license = license.replace(/\s*$/, "");
    license = license.replace("=====  END LICENSE  =====", "");
    license = license.replace("===== BEGIN LICENSE =====", "");
    license = license.trim()
    license = license.replace(/\r\n/g, "\n");
    const lines = license.split("\n").filter(l => l.trim().length > 0);

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

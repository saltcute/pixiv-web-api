import { keygen } from "../keygen";
import * as fs from 'fs';
import * as upath from 'upath';
import { users } from "../users";

function writeKeys(quantity: number, tier: users.tiers, type: keygen.keyType, period: keygen.keyTime, path: string) {
    var map: keygen.keyMap = {};
    if (fs.existsSync(upath.join(__dirname, path))) {
        map = JSON.parse(fs.readFileSync(upath.join(__dirname, path), { encoding: "utf-8", flag: "r" }));
    }
    map = {
        ...map,
        ...keygen.generateKeyObj(quantity, tier, type, period)
    }
    fs.writeFileSync(upath.join(__dirname, path), JSON.stringify(map));
}

function isTier(obj: any): obj is users.tiers {
    return ["Standard", "Backer", "Supporter", "Sponser"].includes(obj);
}
function isKeyTime(obj: any): obj is keygen.keyTime {
    return ["day", "month", "season", "year"].includes(obj);
}
function isKeyType(obj: any): obj is keygen.keyType {
    return ["sub", "quantum", "invalid"].includes(obj);
}
if (process.env.num && process.env.tier && process.env.type && isTier(process.env.tier) && isKeyType(process.env.type) && isKeyTime(process.env.period)) {
    writeKeys(parseInt(process.env.num), process.env.tier, process.env.type, process.env.period, "../keygen/key.json");
    const map: keygen.keyMap = JSON.parse(fs.readFileSync(upath.join(__dirname, "..", "keygen", "key.json"), { encoding: "utf-8" }));
    var obj: any = {};
    for (const key in map) {
        if (!map[key].used) {
            if (!obj[map[key].type]) {
                obj[map[key].type] = {};
            }
            if (!obj[map[key].type][map[key].tier]) {
                obj[map[key].type][map[key].tier] = {}
            }
            if (!obj[map[key].type][map[key].tier][map[key].period]) {
                obj[map[key].type][map[key].tier][map[key].period] = [];
            }
            obj[map[key].type][map[key].tier][map[key].period].push(map[key].key);
        }
    }
    for (const typeV in obj) {
        for (const tierV in obj[typeV]) {
            for (const periodV in obj[typeV][tierV]) {
                if (!fs.existsSync(upath.join(__dirname, "results", typeV, tierV))) fs.mkdirSync(upath.join(__dirname, "results", typeV, tierV), { recursive: true });
                fs.writeFileSync(upath.join(__dirname, "results", typeV, tierV, `${periodV}.txt`), obj[typeV][tierV][periodV].join("\n"), { encoding: "utf-8", flag: "w" });
            }
        }
    }
    // console.log(obj);
}

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as upath from 'upath';
import { linkmap } from '../linkmap';
import { users } from '../users';

export namespace keygen {
    export type keyType = "sub" | "quantum" | "invalid"
    export type keyTime = "day" | "month" | "season" | "year";
    export type keyLiteral = `${string}-${string}-${string}-${string}-${string}`;
    export interface keyMap {
        [key: string]: keyObj
    };
    export interface keyObj {
        key: keyLiteral,
        type: keyType,
        tier: users.tiers
        period: keyTime,
        used: boolean,
        redeem?: {
            time: number,
            uid: string,
            recieved: {
                tier: users.tiers,
                type: keyType
            }
        }
    }
    const characters = "ABCDEFGHJKMNOPQRSTUWXYZ";
    var map: keyMap = {};
    function _load() {
        if (fs.existsSync(upath.join(__dirname, "..", "/config/key.json"))) {
            map = JSON.parse(fs.readFileSync(upath.join(__dirname, "..", "/config/key.json"), { encoding: "utf-8", flag: "r" }));
            linkmap.logger.info("Loaded key list.");
        } else {
            map = {};
            linkmap.logger.info("Key list not found.");
        }
    }
    export function load() {
        _load();
        _save();
    }
    function _save() {
        fs.writeFileSync(upath.join(__dirname, "..", "/config/key.json"), JSON.stringify(map), { encoding: "utf-8", flag: "w" });
    }
    export function save() {
        do {
            try {
                _save();
                _load();
                break;
            } catch (e) {
                linkmap.logger.error(e);
            }
        } while (true);
    }
    export function generate(): keyLiteral {
        var keyPart = [];
        for (var i = 1; i <= 4; ++i) {
            var str = "";
            for (var j = 1; j <= 5; j++) {
                str += characters.charAt(crypto.randomInt(114514) % characters.length);
            }
            keyPart.push(str);
        }
        var validation = "";
        var key = `${keyPart[0]}-${keyPart[1]}-${keyPart[2]}-${keyPart[3]}-`
        for (var j = 1; j <= 5; j++) {
            const hash = crypto.createHash('sha1').update(key + validation).digest("base64");
            validation += characters.charAt(hash.charCodeAt(j) % characters.length);
        }
        return `${keyPart[0]}-${keyPart[1]}-${keyPart[2]}-${keyPart[3]}-${validation}`;
    }
    export function validate(key: string) {
        if (key.length != 29) return false;
        var str = key.slice(0, 24);
        for (var j = 1; j <= 5; j++) {
            const hash = crypto.createHash('sha1').update(str).digest("base64");
            str += characters.charAt(hash.charCodeAt(j) % characters.length);
        }
        return str == key;
    }
    export function getDetail(key: string): keyObj {
        if (map[key]) {
            return map[key];
        } else {
            return {
                key: "AAAAA-AAAAA-AAAAA-AAAAA-AAAAA",
                type: "invalid",
                period: "year",
                tier: "Standard",
                used: false
            }
        }
    }
    export function activate(key: string, uid: string, tier: users.tiers, type: keyType) {
        if (map[key]) {
            map[key].used = true;
            map[key].redeem = {
                time: Date.now(),
                uid: uid,
                recieved: {
                    tier: tier,
                    type: type
                }
            }
            save();
        }
    }
    export function generateKeyObj(quantity: number, tier: users.tiers, type: keyType, period: keyTime) {
        var keyList: keyMap = {};
        for (var l = 0; l < quantity; ++l) {
            const key = keygen.generate();
            keyList[key] = {
                key: key,
                type: type,
                period: period,
                tier: tier,
                used: false
            }
        }
        return keyList;
    }
    export function getMillsecFromPeriod(type: keyTime) {
        const day = 86400 * 1000, mth = day * 30, season = day * 91, year = day * 365;
        switch (type) {
            case "day":
                return day;
            case "month":
                return mth;
            case "season":
                return season;
            case "year":
                return year;
        }
    }
    export function getTierDifference(original: users.tiers, future: users.tiers) {
        const mapping: {
            [tiers in users.tiers]: {
                [tiers in users.tiers]: number
            }
        } = {
            "Standard": {
                "Standard": 0,
                "Backer": 1,
                "Supporter": 1,
                "Sponser": 1,
            },
            "Backer": {
                "Standard": 0,
                "Backer": 1,
                "Supporter": 0.33,
                "Sponser": 0.07,
            },
            "Supporter": {
                "Standard": 0,
                "Backer": 3,
                "Supporter": 1,
                "Sponser": 0.22,
            },
            "Sponser": {
                "Standard": 0,
                "Backer": 14,
                "Supporter": 1,
                "Sponser": 4.67,
            }
        }
        return mapping[original][future];
    }
}
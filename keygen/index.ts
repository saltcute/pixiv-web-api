import * as crypto from 'crypto';
import * as fs from 'fs';
import * as upath from 'upath';
import { linkmap } from '../linkmap';

export namespace keygen {
    export type keyType = "day" | "month" | "season" | "year" | "invalid";
    export type keyLiteral = `${string}-${string}-${string}-${string}-${string}`;
    export interface keyMap {
        [key: string]: keyObj
    };
    export interface keyObj {
        key: keyLiteral,
        type: keyType,
        used: boolean,
        redeem?: {
            time: number,
            uid: number,
            recieved: keyType
        }
    }
    const characters = "ABCDEFGHJKMNOPQRSTUWXYZ";
    var map: keyMap = {};
    export function load() {
        if (fs.existsSync(upath.join(__dirname, "key.json"))) {
            map = JSON.parse(fs.readFileSync(upath.join(__dirname, "key.json"), { encoding: "utf-8", flag: "r" }));
            linkmap.logger.info("Loaded key list.");
        } else {
            map = {};
            linkmap.logger.info("Key list not found.");
        }
    }
    export function save() {
        fs.writeFileSync(upath.join(__dirname, "key.json"), JSON.stringify(map), { encoding: "utf-8", flag: "w" });
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
            const hash = crypto.createHash('sha1').update(key).digest("base64");
            validation += characters.charAt(hash.charCodeAt(j) % characters.length);
        }
        return `${keyPart[0]}-${keyPart[1]}-${keyPart[2]}-${keyPart[3]}-${validation}`;
    }
    export function validate(key: string) {
        if (key.length != 29) return false;
        const test = key.slice(24);
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
                used: false
            }
        }
    }
    export function activate(key: string, uid: number, recieved: keyType) {
        if (map[key]) {
            map[key].used = true;
            map[key].redeem = {
                time: Date.now(),
                uid: uid,
                recieved: recieved
            }
            save();
        }
    }
    export function getkeyObj(quantity: number, type: keyType) {
        var keyList: keyMap = {};
        for (var l = 0; l < quantity; ++l) {
            const key = keygen.generate();
            keyList[key] = {
                key: key,
                type: type,
                used: false
            }
        }
        return keyList;
    }
}
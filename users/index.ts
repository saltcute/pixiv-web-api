import * as crypto from 'crypto';
import * as fs from 'fs';
import * as upath from 'upath';
import { keygen } from '../keygen';
import { linkmap } from '../linkmap';

export namespace users {
    export type tiers = "standard" | "backer" | "supporter" | "sponser";
    export type commands = "top" | "tag" | "author" | "random" | "refresh" | "detail" | "illust" | "credit" | "help";
    export interface user {
        kookid: number,
        kook: {
            id: number,
            username: string,
            identityNum: number,
            avatarLink: string,
        },
        pixiv: {
            tier: tiers,
            expire: number,
            status: {
                banned: boolean,
                until?: number
            },
            statistics: {
                last_seen_on: number,
                total_requests_counter: number,
                command_requests_counter: {
                    [trigger in commands]: number
                },
                new_illustration_requested: number,
                total_illustration_requested: number,
                keys_activated: number,
                activated_key: keygen.keyObj[]
            }
        }
    }
    export function isUser(obj: any): obj is user {
        return 'kookid' in obj;
    }
    var users: {
        [uid: string]: user
    } = {};
    export function load() {
        if (fs.existsSync(upath.join(__dirname, "users.json"))) {
            users = JSON.parse(fs.readFileSync(upath.join(__dirname, "users.json"), { encoding: "utf-8", flag: "r" }));
            linkmap.logger.info("Loaded user list.");
        } else {
            users = {};
            linkmap.logger.info("User list not found.");
            save();
        }
    }
    export function save() {
        fs.writeFileSync(upath.join(__dirname, "users.json"), JSON.stringify(users), { encoding: "utf-8", flag: "w" });
    }
    export function update(update: user) {
        users = {
            ...users,
            [update.kook.id]: update
        }
    }
    export function detail(uid: string): user | false {
        return users[uid];
    }
}
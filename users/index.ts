import * as crypto from 'crypto';
import * as fs from 'fs';
import * as upath from 'upath';
import { keygen } from '../keygen';
import { linkmap } from '../linkmap';

export namespace users {
    export const quantumCapacityPerPack = 1000;
    export type tiers = "Standard" | "Backer" | "Supporter" | "Sponser";
    const Commands = ["top", "tag", "author", "random", "refresh", "detail", "illust", "credit", "help"] as const;
    export type commands = typeof Commands[number];
    export interface userMeta {
        id: string,
        identifyNum: string,
        username: string,
        avatar: string
    }
    export interface user {
        kookid: string,
        kook: userMeta,
        pixiv: {
            tier: tiers,
            expire: number,
            register: number,
            quantum_pack_capacity: number,
            status: {
                banned: boolean,
                until?: number
            },
            statistics_today: {
                command_requests_counter: {
                    [trigger in commands]: number
                },
                new_illustration_requested: number,
                total_illustration_requested: number,
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
        if (fs.existsSync("config/users.json")) {
            users = JSON.parse(fs.readFileSync("config/users.json", { encoding: "utf-8", flag: "r" }));
            linkmap.logger.info("Loaded user list.");
        } else {
            users = {};
            linkmap.logger.info("User list not found.");
            save();
        }
    }
    export function init(user: userMeta) {
        linkmap.logger.info(`Initialize profile for ${user.username}$${user.identifyNum} (${user.id})`);
        users[user.id] = {
            kookid: user.id,
            kook: user,
            pixiv: {
                tier: "Standard",
                expire: 0,
                register: Date.now(),
                quantum_pack_capacity: 0,
                status: {
                    banned: false
                },
                statistics_today: {
                    command_requests_counter: {
                        top: 0,
                        tag: 0,
                        author: 0,
                        random: 0,
                        refresh: 0,
                        detail: 0,
                        illust: 0,
                        credit: 0,
                        help: 0
                    },
                    new_illustration_requested: 0,
                    total_illustration_requested: 0
                },
                statistics: {
                    last_seen_on: 0,
                    total_requests_counter: 0,
                    command_requests_counter: {
                        top: 0,
                        tag: 0,
                        author: 0,
                        random: 0,
                        refresh: 0,
                        detail: 0,
                        illust: 0,
                        credit: 0,
                        help: 0
                    },
                    new_illustration_requested: 0,
                    total_illustration_requested: 0,
                    keys_activated: 0,
                    activated_key: []
                }
            }
        }
    }
    export function resetDailyCounter() {
        linkmap.logger.info("Reset daily counter");
        for (const ky in users) {
            users[ky].pixiv.statistics_today = {
                command_requests_counter: {
                    top: 0,
                    tag: 0,
                    author: 0,
                    random: 0,
                    refresh: 0,
                    detail: 0,
                    illust: 0,
                    credit: 0,
                    help: 0
                },
                new_illustration_requested: 0,
                total_illustration_requested: 0
            }
        }
        save();
    }
    export function save() {
        fs.writeFileSync("config/users.json", JSON.stringify(users), { encoding: "utf-8", flag: "w" });
        linkmap.logger.info("Saved user profiles");
    }
    export function update(update: user) {
        users = {
            ...users,
            [update.kook.id]: update
        }
    }
    export async function detail(uid: string): Promise<user> {
        if (users[uid]) {
            if (users[uid].pixiv.expire < Date.now()) {// Check membership expiry
                users[uid].pixiv.expire = 0;
                users[uid].pixiv.tier = "Standard";
            }
            return users[uid];
        } else {
            throw { code: 40002, message: "User not found" };
        }
    }
}
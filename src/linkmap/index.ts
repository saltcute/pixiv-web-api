import fs from 'fs';
import upath from 'upath';
import bunyan from 'bunyan';
export namespace linkmap {
    export const logger = bunyan.createLogger({
        name: "pixiv-web-api",
        streams: [
            {
                level: bunyan.INFO,
                stream: process.stdout
            },
            {
                level: bunyan.ERROR,
                stream: process.stderr
            }
        ]
    })
    export type banResult = {
        ban: boolean,
        label?: string,
        probability: number
    }
    export type blurReason = {
        terrorism: banResult,
        ad: banResult,
        live: banResult,
        porn: banResult,
    };
    export type detectionResult = {
        blur: number,
        reason: blurReason
    }
    export var map: {
        [key: string]: {
            [key: string]: linkmap
        }
    };
    type linkmap = {
        kookLink: string,
        NSFWResult: detectionResult,
        suggestion: {
            ban: boolean
            blurAmount: number
        }
    }
    export function _load(): void {
        if (fs.existsSync(upath.join(__dirname, "..", "/config/map.json"))) {
            map = JSON.parse(fs.readFileSync(upath.join(__dirname, "..", "/config/map.json"), { encoding: "utf-8", flag: "r" }));
            logger.info(`Loaded linkmap`);
        } else {
            map = {};
            logger.warn(`Linkmap not found, creating new`);
        }
    }
    export function load(): void {
        _load();
        save();
    }

    export function isInDatabase(illustID: string): boolean {
        if (map.hasOwnProperty(illustID)) {
            return true;
        } else {
            return false;
        }
    }

    export function getLink(illustID: string, page: string): string {
        if (isInDatabase(illustID)) {
            return map[illustID][page].kookLink;
        } else {
            return "";
        }
    }

    export function getDetection(illustID: string, page: string): detectionResult {
        if (isInDatabase(illustID)) {
            return map[illustID][page].NSFWResult;
        } else {
            return {
                blur: 0,
                reason: {
                    terrorism: {
                        ban: false,
                        probability: 100
                    },
                    ad: {
                        ban: false,
                        probability: 100
                    },
                    live: {
                        ban: false,
                        probability: 100
                    },
                    porn: {
                        ban: false,
                        probability: 100
                    }
                }
            };
        }
    }

    export function addMap(illustID: string, illustPage: string, illustLink: string, detectionResult: detectionResult): void {
        map = {
            ...map,
            [illustID]: {
                [illustPage]: {
                    kookLink: illustLink,
                    NSFWResult: detectionResult,
                    suggestion: {
                        ban: detectionResult.blur > 0,
                        blurAmount: detectionResult.blur
                    }
                }
            }
        };
    }

    export function _save() {
        fs.writeFileSync(upath.join(__dirname, "..", "/config/map.json"), JSON.stringify(map));
    }
    export function save() {
        do {
            try {
                _save();
                _load();
                break;
            } catch (e) {
                logger.error(e);
            }
        } while (true);
    }
}
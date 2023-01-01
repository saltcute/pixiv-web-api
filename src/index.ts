import express from 'express';
const app = express();
import * as pixNode from 'pixnode';
import * as fs from 'fs';
import { linkmap } from './linkmap';
import config from './config/config';
import schedule from 'node-schedule';
import mcache from 'memory-cache';
import { keygen } from './keygen';
import { users } from './users';
import upath from 'upath';

const cache = (duration: number) => {
    return (req: any, res: any, next: any) => {
        const key = '__express__' + req.originalUrl || req.url;
        const cachedBody = mcache.get(key);
        if (cachedBody) {
            if (req.query.user && typeof req.query.user == 'string') {
                const user = JSON.parse(req.query.user)
                linkmap.logger.info(`CACHED ${req.path} from ${user.username}#${user.identifyNum} (ID ${user.id})`);
            } else if (req.body.user) {
                const user = req.body.user;
                linkmap.logger.info(`CACHED ${req.path} from ${user.username}#${user.identifyNum} (ID ${user.id})`);
            } else {
                linkmap.logger.info(`CACHED ${req.path}`);
            }
            res.send(cachedBody);
            return;
        } else {
            res.sendResponse = res.send;
            res.send = (body: any) => {
                mcache.put(key, body, duration * 1000);
                res.sendResponse(body);
            }
            next()
        }
    }
}

try {
    var auth = JSON.parse(fs.readFileSync(upath.join(__dirname, "/config/auth.json"), { encoding: 'utf-8', flag: 'r' }));
} catch (err) {
    linkmap.logger.fatal("Cannot find authorization credentials, Please run \"npm run login\" first.");
    process.exit();
}
pixNode.common.setLanguage("zh-cn");

users.load();
keygen.load();
linkmap.load();
schedule.scheduleJob("0,15,30,45 * * * * ", () => {
    linkmap.save();
    users.save();
    keygen.save();
})
schedule.scheduleJob("0 4 * * * ", () => {
    users.resetDailyCounter();
})
var job = schedule.scheduleJob((auth.expire_time - 60) * 1000, () => {
    refresh();
})
if (auth.expire_time - 60 < Math.round(Date.now())) {
    refresh();
}
function refresh() {
    pixNode.authenticate.refresh(auth.refresh_token).then((res) => {
        auth = res;
        fs.writeFileSync(upath.join(__dirname, "/config/auth.json"), JSON.stringify(auth), { encoding: 'utf-8', flag: 'w' });
        linkmap.logger.info("Token refreshed");
        try {
            job?.cancel();
            job = schedule.scheduleJob((auth.expire_time - 60) * 1000, () => {
                refresh();
            })
        } catch (err) {
            linkmap.logger.error("Setting next refresh job failed");
            linkmap.logger.error(err);
        }
    }).catch((err) => {
        linkmap.logger.error(err);
    })
}
if (auth.refresh_token == undefined) {
    throw `LoginError: run "npm login" first`;
}

app.use(express.json({ limit: '50mb' }));

/**
 * Admin
 */
app.get('/manage/save', (req, res) => {
    linkmap.save();
    users.save;
    keygen.save();
    res.send({ "code": "0", "message": "Success" });
})

/**
 * User
 */
app.get('/user/profile', (req, res) => {
    if (req.query.user && typeof req.query.user == 'string') {
        const user = JSON.parse(req.query.user)
        linkmap.logger.info(`GET ${req.path} from ${user.username}#${user.identifyNum} (ID ${user.id})`);
    } else {
        linkmap.logger.info(`GET ${req.path}`);
    }
    const uid = req.query.id;
    if (typeof uid == 'string' && !isNaN(parseInt(uid))) {
        users.detail(uid).then((profile) => {
            res.send({ "code": "0", "message": "Success", "data": profile });
        }).catch(() => {
            if (req.query.user && typeof req.query.user == 'string') {
                users.init(JSON.parse(req.query.user))
                users.detail(uid).then((profile) => {
                    res.send({ "code": "0", "message": "Success", "data": profile });
                }).catch(() => {
                    res.send({ "code": "40001", "message": "Cannot find the user profile of given ID." });
                })
            } else {
                res.send({ "code": "40001", "message": "Cannot find the user profile of given ID." });
            }
        });
    } else {
        res.send({ "code": "40000", "message": "Wrong user ID." });
    }

});
app.post('/user/profile/update', (req, res) => {
    linkmap.logger.info(`POST ${req.path}`);
    if (req.headers.authorization && config.bearer.includes(req.headers.authorization)) {
        const data: users.user = req.body;
        if (users.isUser(data)) {
            users.update(data);
            res.send({ "code": "0", "message": "Update success." });
        } else {
            res.send({ "code": "40000", "message": "Wrong user format." });
        }
    } else {
        res.status(401);
        res.send({ "code": "401", "message": "Authorization failed" });
        linkmap.logger.debug("Unauthrozied request for key status");
    }
})
app.post('/user/key/activate', async (req, res) => {
    if (req.body.user) {
        const user = req.body.user;
        linkmap.logger.info(`POST ${req.path} from ${user.username}#${user.identifyNum} (ID ${user.id})`);
    } else {
        linkmap.logger.info(`POST ${req.path}`);
    }
    if (req.headers.authorization && config.bearer.includes(req.headers.authorization)) {
        const key: string = req.body.key;
        const uid: string = req.body.user.id;
        if (keygen.validate(key)) {
            const keyDetail = keygen.getDetail(key);
            if (!keyDetail.used && keyDetail.type != "invalid") {
                await users.detail(uid).catch((e) => {
                    if (e.code == "40002") { // User not found
                        if (req.body.user) {
                            const user = req.body.user;
                            users.init(user);
                        } else {
                            linkmap.logger.warn(e);
                            return res.send(e);
                        }
                    } else {
                        linkmap.logger.error(e);
                    }
                });
                await users.detail(uid).then((user) => {
                    if (keyDetail.type == "sub") {
                        const now = Date.now();
                        if (user.pixiv.expire < Date.now()) user.pixiv.expire = now;
                        const expireAfter = user.pixiv.expire - now;
                        if (user.pixiv.tier == keyDetail.tier) {
                            user.pixiv.expire = now + expireAfter + keygen.getMillsecFromPeriod(keyDetail.period);
                        } else {
                            if (keygen.getTierDifference(user.pixiv.tier, keyDetail.tier) > 1) { // Current tier is higher
                                user.pixiv.expire = now + expireAfter + keygen.getMillsecFromPeriod(keyDetail.period) * keygen.getTierDifference(keyDetail.tier, user.pixiv.tier);
                            } else { // Current tier is lower
                                user.pixiv.expire = now + keygen.getMillsecFromPeriod(keyDetail.period) + expireAfter * keygen.getTierDifference(user.pixiv.tier, keyDetail.tier);
                                user.pixiv.tier = keyDetail.tier;
                            }
                        }
                    } else if (keyDetail.type == "quantum") {
                        user.pixiv.quantum_pack_capacity += users.quantumCapacityPerPack;
                    }
                    user.pixiv.statistics.keys_activated++;
                    user.pixiv.statistics.activated_key.push(keyDetail);
                    users.update(user);
                    users.save();
                    keygen.activate(keyDetail.key, uid, keyDetail.tier, keyDetail.type);
                    keygen.save();
                }).catch((e) => {
                    linkmap.logger.error(e);
                });
                res.send({ "code": "0", "message": "Activate success.", "data": keygen.getDetail(key) });
            } else {
                res.send({ "code": "40001", "message": "The key is already been used or does not exist." });
            }
        } else {
            res.send({ "code": "40000", "message": "Illegal key." });
        }
    } else {
        res.status(401);
        res.send({ "code": "401", "message": "Authorization failed" });
        linkmap.logger.debug("Unauthrozied request for key status");
    }
})

/**
 * Linkmap
 */

app.post('/linkmap/update', (req, res) => {
    linkmap.logger.info(`POST ${req.path}`);
    if (req.headers.authorization && config.bearer.includes(req.headers.authorization)) {
        res.send({ "code": "200", "message": "Success" });
        for (const key in req.body) {
            for (const page in req.body[key]) {
                linkmap.addMap(key, page, req.body[key][page].kookLink, req.body[key][page].NSFWResult)
            }
        }
        linkmap.logger.debug("Linkmap updated");
        linkmap.logger.trace("Full request body:");
        linkmap.logger.trace(req.body)
    } else {
        res.status(401);
        res.send({ "code": "401", "message": "Authorization failed" });
        linkmap.logger.debug("Linkmap updating Authorization failed");
    }
})
app.get('/linkmap', (req, res) => {
    if (req.query.user && typeof req.query.user == 'string') {
        const user = JSON.parse(req.query.user)
        linkmap.logger.info(`GET ${req.path} from ${user.username}#${user.identifyNum} (ID ${user.id})`);
    } else {
        linkmap.logger.info(`GET ${req.path}`);
    }
    res.send(linkmap.map);
})

/**
 * Illustrations
 */

app.get('/illustration/related', cache(15 * 60), (req, res) => {
    if (req.query.user && typeof req.query.user == 'string') {
        const user = JSON.parse(req.query.user)
        linkmap.logger.info(`GET ${req.path} from ${user.username}#${user.identifyNum} (ID ${user.id})`);
    } else {
        linkmap.logger.info(`GET ${req.path}`);
    }
    var keyword = -1;
    if (req.query.keyword === undefined) {
        res.status(400);
        res.send({
            code: 400,
            response: { message: "Please specificate the illustration ID." }
        });
        return;
    } else if (typeof req.query.keyword == "string" && isNaN(parseInt(req.query.keyword)) == false) {
        keyword = parseInt(req.query.keyword);
    } else {
        res.status(400);
        res.send({
            code: 400,
            response: { message: `Please specificate a valid illustration ID (Recieved ${req.query.keyword})` }
        });
        return;
    }
    pixNode.fetch.relatedIllustrations(auth, keyword, {}).then((data) => {
        res.send(data);
    }).catch((err) => {
        res.status(err.response.status);
        res.send({
            code: err.response.status,
            message: err.response.statusText,
            data: err.response.data
        });
    });
});

app.get('/illustration/recommend', cache(5), (req, res) => {
    if (req.query.user && typeof req.query.user == 'string') {
        const user = JSON.parse(req.query.user)
        linkmap.logger.info(`GET ${req.path} from ${user.username}#${user.identifyNum} (ID ${user.id})`);
    } else {
        linkmap.logger.info(`GET ${req.path}`);
    }
    pixNode.fetch.recommendedIllustrations(auth, { contentType: "ILLUSTRATION", }).then((data) => {
        res.send(data);
    }).catch((err) => {
        res.status(err.response.status);
        res.send({
            code: err.response.status,
            message: err.response.statusText,
            data: err.response.data
        });
    })
});

/**
 * Get today's ranklist
 */
app.get('/illustration/ranklist', cache(15 * 60), (req, res) => {
    if (req.query.user && typeof req.query.user == 'string') {
        const user = JSON.parse(req.query.user)
        linkmap.logger.info(`GET ${req.path} from ${user.username}#${user.identifyNum} (ID ${user.id})`);
    } else {
        linkmap.logger.info(`GET ${req.path}`);
    }
    var dur = typeof req.query.duration == "string" ? req.query.duration : undefined;
    var duration: "DAY" | "WEEK" | "MONTH" | "DAY_MALE" | "DAY_FEMALE" | "WEEK_ORIGINAL" | "WEEK_ROOKIE" | "DAY_MANGA" | undefined
    if (dur == "DAY" || dur == "WEEK" || dur == "MONTH" || dur == "DAY_MALE" || dur == "DAY_FEMALE" || dur == "WEEK_ORIGINAL" || dur == "WEEK_ROOKIE" || dur == "DAY_MANGA") {
        duration = dur;
    } else {
        duration = "WEEK";
    }
    pixNode.fetch.illustrationRanking(auth, { mode: duration }).then((data) => {
        res.send(data);
    }).catch((err) => {
        res.status(err.response.status);
        res.send({
            code: err.response.status,
            message: err.response.statusText,
            data: err.response.data
        });
    })
})

/**
 * Tag ranklist
 */
app.get('/illustration/tag', cache(20 * 60), (req, res) => {
    if (req.query.user && typeof req.query.user == 'string') {
        const user = JSON.parse(req.query.user)
        linkmap.logger.info(`GET ${req.path} from ${user.username}#${user.identifyNum} (ID ${user.id})`);
    } else {
        linkmap.logger.info(`GET ${req.path}`);
    }
    const offset = typeof req.query.offset === "string" ? parseInt(req.query.offset) : undefined;
    var dur = typeof req.query.duration == "string" ? req.query.duration : undefined;
    var duration: "LAST_DAY" | "LAST_WEEK" | "LAST_MONTH" | undefined;
    if (dur == "LAST_DAY" || dur == "LAST_WEEK" || dur == "LAST_MONTH") {
        duration = dur;
    } else {
        duration = undefined;
    }
    var keyword = "";
    if (req.query.keyword === undefined) {
        res.status(400);
        res.send({
            code: 400,
            response: { message: "Please specificate a keyword." }
        });
        return;
    } else if (typeof req.query.keyword == "string") {
        keyword = req.query.keyword;
    } else {
        res.status(400);
        res.send({
            code: 400,
            response: { message: `Please specificate a valid keyword (Recieved ${req.query.keyword}).` }
        });
        return;
    }

    pixNode.fetch.searchForIllustration(auth, keyword, { duration: duration, offset: offset, sort: "MALE_DESC" }).then((data) => {
        res.send(data);
    }).catch((err) => {
        res.status(err.response.status);
        res.send({
            code: err.response.status,
            message: err.response.statusText,
            data: err.response.data
        });
    })
})

app.get("/illustration/detail", cache(30 * 60), (req, res) => {
    if (req.query.user && typeof req.query.user == 'string') {
        const user = JSON.parse(req.query.user)
        linkmap.logger.info(`GET ${req.path} from ${user.username}#${user.identifyNum} (ID ${user.id})`);
    } else {
        linkmap.logger.info(`GET ${req.path}`);
    }
    var keyword = -1;
    if (req.query.keyword === undefined) {
        res.status(400);
        res.send({
            code: 400,
            response: { message: "Please specificate the illustration ID." }
        });
        return;
    } else if (typeof req.query.keyword == "string" && isNaN(parseInt(req.query.keyword)) == false) {
        keyword = parseInt(req.query.keyword);
    } else {
        res.status(400);
        res.send({
            code: 400,
            response: { message: `Please specificate a valid illustration ID (Recieved ${req.query.keyword})` }
        });
        return;
    }
    pixNode.fetch.illustration(auth, keyword).then((data) => {
        res.send(data);
    }).catch((err) => {
        res.status(err.response.status);
        res.send({
            code: err.response.status,
            message: err.response.statusText,
            data: err.response.data
        });
    })
})

app.get("/illustration/creator", cache(10 * 60), (req, res) => {
    if (req.query.user && typeof req.query.user == 'string') {
        const user = JSON.parse(req.query.user)
        linkmap.logger.info(`GET ${req.path} from ${user.username}#${user.identifyNum} (ID ${user.id})`);
    } else {
        linkmap.logger.info(`GET ${req.path}`);
    }
    var keyword: number;
    if (req.query.keyword === undefined) {
        res.status(400);
        res.send({
            code: 400,
            response: { message: "Please specificate the user ID." }
        });
        return;
    } else if (typeof req.query.keyword == "string" && isNaN(parseInt(req.query.keyword)) == false) {
        keyword = parseInt(req.query.keyword);
    } else {
        res.status(400);
        res.send({
            code: 400,
            response: { message: `Please specificate a valid user ID (Recieved ${req.query.keyword}).` }
        });
        return;
    }
    pixNode.fetch.userIllustrations(auth, keyword, { contentType: "ILLUSTRATION" }).then((data) => {
        res.send(data);
    }).catch((err) => {
        res.status(err.response.status);
        res.send({
            code: err.response.status,
            message: err.response.statusText,
            data: err.response.data
        });
    })
})

var port = 9999;
if (process.env.PORT && !isNaN(parseInt(process.env.PORT))) {
    port = parseInt(process.env.PORT);
}

app.listen(port, () => {
    linkmap.logger.info(`Server start listening on port ${port}`);
})
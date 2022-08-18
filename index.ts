import express = require('express');
const app = express();
const port = 8888;
import * as pixNode from 'pixnode';
import fs = require('fs');
import { linkmap } from './linkmap';
import config from './config/config';
import schedule from 'node-schedule';
import mcache from 'memory-cache';
import { keygen } from './keygen';
import { users } from './users';

const cache = (duration: number) => {
    return (req: any, res: any, next: any) => {
        const key = '__express__' + req.originalUrl || req.url;
        const cachedBody = mcache.get(key);
        if (cachedBody) {
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


var auth = JSON.parse(fs.readFileSync("./config/auth.json", { encoding: 'utf-8', flag: 'r' }));
pixNode.common.setLanguage("zh-cn");

users.load();
keygen.load();
linkmap.load();
schedule.scheduleJob("30 * * * * ", () => {
    linkmap.save();
})
var job = schedule.scheduleJob((auth.expire_time - 60) * 1000, () => {
    refresh();
})
if (auth.expire_time - 60 < Math.round(Date.now())) {
    refresh();
}
function refresh() {
    pixNode.authenticate.refresh(auth.refresh_token, (res, err) => {
        if (err) console.error(err);
        auth = res;
        fs.writeFileSync("./config/auth.json", JSON.stringify(auth), { encoding: 'utf-8', flag: 'w' });
        linkmap.logger.info("Token refreshed");
        job.cancel();
        job = schedule.scheduleJob((auth.expire_time - 60) * 1000, () => {
            refresh();
        })
    });
}
if (auth.refresh_token == undefined) {
    throw `LoginError: run "npm login" first`;
}

app.use(express.json({ limit: '50mb' }));

/**
 * User
 */
app.get('/user/profile', cache(30), (req, res) => {
    const uid = req.query.id;
    if (typeof uid == 'string' && !isNaN(parseInt(uid))) {
        const profile = users.detail(uid);
        if (profile) {
            res.end(JSON.stringify(profile));
        } else {
            res.end(JSON.stringify({ "code": "40001", "message": "Cannot find the user profile of given ID." }));
        }
    } else {
        res.end(JSON.stringify({ "code": "40000", "message": "Wrong user ID." }));
    }

});
app.post('/user/profile/update', (req, res) => {
    if (req.headers.authorization && config.bearer.includes(req.headers.authorization)) {
        const data: users.user = req.body;
        if (users.isUser(data)) {
            users.update(data);
            res.end(JSON.stringify({ "code": "0", "message": "Update success." }));
        } else {
            res.end(JSON.stringify({ "code": "40000", "message": "Wrong user format." }));
        }
    } else {
        res.status(401);
        res.end(JSON.stringify({ "code": "401", "message": "Authorization failed" }));
        linkmap.logger.debug("Unauthrozied request for key status");
    }
})
app.post('/user/key/activate', (req, res) => {
    if (req.headers.authorization && config.bearer.includes(req.headers.authorization)) {
        const data: keygen.keyObj = req.body.key;
        const user: number = req.body.user;
        if (keygen.validate(data.key)) {
            const keyDetail = keygen.getDetail(data.key);
            if (!keyDetail.used && keyDetail.type != "invalid") {
                keygen.activate(data.key, user, data.type);
                res.end(JSON.stringify({ "code": "0", "message": "Activate success." }));
            } else {
                res.end(JSON.stringify({ "code": "40001", "message": "The key is already been used or does not exist." }));
            }
        } else {
            res.end(JSON.stringify({ "code": "40000", "message": "Illegal key." }));
        }
    } else {
        res.status(401);
        res.end(JSON.stringify({ "code": "401", "message": "Authorization failed" }));
        linkmap.logger.debug("Unauthrozied request for key status");
    }
})

/**
 * Linkmap
 */

app.post('/linkmap/update', (req, res) => {
    if (req.headers.authorization && config.bearer.includes(req.headers.authorization)) {
        res.end(JSON.stringify({ "code": "200", "message": "Success" }));
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
        res.end(JSON.stringify({ "code": "401", "message": "Authorization failed" }));
        linkmap.logger.debug("Linkmap updating Authorization failed");
    }
})
app.get('/linkmap/get', cache(60), (req, res) => {
    res.end(JSON.stringify(linkmap.map));
})

/**
 * Illustrations
 */

app.get('/illustration/recommend', cache(5), (req, res) => {
    pixNode.fetch.recommendedIllustrations(auth, { contentType: "ILLUSTRATION", }, (rel, err) => {
        if (err) {
            res.send(err);
        } else res.send(rel);
    })
});

/**
 * Get today's ranklist
 */
app.get('/illustration/ranklist', cache(15 * 60), (req, res) => {

    var dur = typeof req.query.duration == "string" ? req.query.duration : undefined;
    var duration: "DAY" | "WEEK" | "MONTH" | "DAY_MALE" | "DAY_FEMALE" | "WEEK_ORIGINAL" | "WEEK_ROOKIE" | "DAY_MANGA" | undefined
    if (dur == "DAY" || dur == "WEEK" || dur == "MONTH" || dur == "DAY_MALE" || dur == "DAY_FEMALE" || dur == "WEEK_ORIGINAL" || dur == "WEEK_ROOKIE" || dur == "DAY_MANGA") {
        duration = dur;
    } else {
        duration = "WEEK";
    }
    pixNode.fetch.illustrationRanking(auth, { mode: duration }, (rel, err) => {
        if (err) {
            res.send(err);
        } else res.send(rel);
    })
})

/**
 * Tag ranklist
 */
app.get('/illustration/tag', cache(20 * 60), (req, res) => {

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
        res.send({
            code: 400,
            response: { message: "Please specificate a keyword." }
        });
        return;
    } else if (typeof req.query.keyword == "string") {
        keyword = req.query.keyword;
    } else {
        res.send({
            code: 400,
            response: { message: `Please specificate a valid keyword (Recieved ${req.query.keyword}).` }
        });
        return;
    }

    pixNode.fetch.searchForIllustration(auth, keyword, { duration: duration, offset: offset, sort: "MALE_DESC" }, (rel, err) => {
        if (err) {
            res.send(err);
        } else res.send(rel);
    })
})

app.get("/illustration/detail", cache(30 * 60), (req, res) => {
    var keyword = "";
    if (req.query.keyword === undefined) {
        res.send({
            code: 400,
            response: { message: "Please specificate the illustration ID." }
        });
        return;
    } else if (typeof req.query.keyword == "string" && isNaN(parseInt(req.query.keyword)) == false) {
        keyword = req.query.keyword;
    } else {
        res.send({
            code: 400,
            response: { message: `Please specificate a valid illustration ID (Recieved ${req.query.keyword})` }
        });
        return;
    }
    pixNode.fetch.illustration(auth, keyword, (rel, err) => {
        if (err) {
            res.send(err);
        } else res.send(rel);
    })
})

app.get("/illustration/creator", cache(10 * 60), (req, res) => {
    var keyword: number;
    if (req.query.keyword === undefined) {
        res.send({
            code: 400,
            response: { message: "Please specificate the user ID." }
        });
        return;
    } else if (typeof req.query.keyword == "string" && isNaN(parseInt(req.query.keyword)) == false) {
        keyword = parseInt(req.query.keyword);
    } else {
        res.send({
            code: 400,
            response: { message: `Please specificate a valid user ID (Recieved ${req.query.keyword}).` }
        });
        return;
    }
    pixNode.fetch.userIllustrations(auth, keyword, { contentType: "ILLUSTRATION" }, (rel, err) => {
        if (err) {
            res.send(err);
        } else res.send(rel);
    })
})

app.listen(port, () => {
    linkmap.logger.info(`Server start listening on port ${port}`);
})
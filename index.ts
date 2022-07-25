import express = require('express');
const app = express();
const port = 8888;
import * as pixNode from 'pixnode';
import fs = require('fs');
import { linkmap } from './linkmap';
import config from './config/config';
import schedule from 'node-schedule';

var auth = JSON.parse(fs.readFileSync("./config/auth.json", { encoding: 'utf-8', flag: 'r' }));
pixNode.common.setLanguage("zh-cn");

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
        linkmap.log("Token refreshed");
        job.reschedule((auth.expire_time - 60) * 1000);
    });
}
if (auth.refresh_token == undefined) {
    throw `LoginError: run "npm login" first`;
}

app.use(express.json({ limit: '50mb' }));

app.post('/updateLinkmap', (req, res) => {
    if (req.headers.authorization && config.bearer.includes(req.headers.authorization)) {
        res.end(JSON.stringify({ "code": "200", "message": "Success" }));
        for (const key in req.body) {
            for (const page in req.body[key]) {
                linkmap.addMap(key, page, req.body[key][page].kookLink, req.body[key][page].NSFWResult)
            }
        }
    } else {
        res.status(401);
        res.end(JSON.stringify({ "code": "401", "message": "Authorization failed" }));
    }
})
app.get('/linkmap', (req, res) => {
    res.end(JSON.stringify(linkmap.map));
})

app.get('/recommend', (req, res) => {
    pixNode.fetch.recommendedIllustrations(auth, { contentType: "ILLUSTRATION", }, (rel, err) => {
        if (err) {
            res.send(err);
        } else res.send(rel);
    })
});

/**
 * Get today's ranklist
 */
app.get('/ranklist', (req, res) => {

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
app.get('/topInTag', (req, res) => {

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

app.get("/illustrationDetail", (req, res) => {
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

app.get("/creatorIllustrations", (req, res) => {
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
    linkmap.log(`Server start listening on port ${port}`);
})
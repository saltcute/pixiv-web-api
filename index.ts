import express = require('express');
const app = express();
const port = 8888;
import * as pixNode from 'pixnode';
import fs = require('fs');
import { linkmap } from './linkmap';
import config from './config/config';
import schedule from 'node-schedule';

var loginCredentials = JSON.parse(fs.readFileSync("./config/auth.json", { encoding: 'utf-8', flag: 'r' }));
pixNode.common.setLanguage("zh-cn");

linkmap.load();
schedule.scheduleJob("30 * * * * ", () => {
    linkmap.save();
})

app.use(express.json({ limit: '50mb' }));

app.post('/updateLinkmap', (req, res) => {
    if (req.headers.authorization && config.bearer.includes(req.headers.authorization)) {
        for (const key in req.body) {
            for (const page in req.body[key]) {
                linkmap.addMap(key, page, req.body[key][page].kookLink, req.body[key][page].NSFWResult)
            }
        }
        res.end(JSON.stringify({ "code": "200", "message": "Success" }));
    } else {
        res.status(401);
        res.end(JSON.stringify({ "code": "401", "message": "Authorization failed" }));
    }
})
app.get('/linkmap', (req, res) => {
    res.end(JSON.stringify(linkmap.map));
})

app.get('/recommend', (req, res) => {
    function returnRecommend(
        res: any,
        login: pixNode.types.loginCredential
    ) {
        pixNode.fetch.recommendedIllustrations(login, { contentType: "ILLUSTRATION", }, (rel, err) => {
            if (err) {
                res.send(err);
            } else res.send(rel);
        })
    }
    if (loginCredentials.expire_time === undefined || loginCredentials.expire_time + 60 < Math.floor(Date.now() / 1000)) { // If session invaild
        if (loginCredentials.refresh_token !== undefined) { // If have logged in before 
            pixNode.authenticate.refresh(loginCredentials.refresh_token, (rel, err) => { // Refresh current session
                if (err) {
                    res.send(err);
                }
                if (rel) returnRecommend(res, rel);
            })
        } else { // Throw error to login
            // res.status(500);
            res.send({
                code: 500,
                response: { message: "Login credentials invalid." }
            })
            throw `LoginError: run "npm login" first`;
        }
    } else {
        returnRecommend(res, loginCredentials);
    }
});

/**
 * Get today's ranklist
 */
app.get('/ranklist', (req, res) => {
    function returnRanklist(
        res: any,
        login: pixNode.types.loginCredential,
        mode?: "DAY" | "WEEK" | "MONTH" | "DAY_MALE" | "DAY_FEMALE" | "WEEK_ORIGINAL" | "WEEK_ROOKIE" | "DAY_MANGA" | undefined,
        offset?: string
    ) {
        pixNode.fetch.illustrationRanking(login, { mode: mode }, (rel, err) => {
            if (err) {
                res.send(err);
            } else res.send(rel);
        })
    }

    const offset = typeof req.query.offset === 'string' ? req.query.offset : undefined;
    var dur = typeof req.query.duration == "string" ? req.query.duration : undefined;
    var duration: "DAY" | "WEEK" | "MONTH" | "DAY_MALE" | "DAY_FEMALE" | "WEEK_ORIGINAL" | "WEEK_ROOKIE" | "DAY_MANGA" | undefined
    if (dur == "DAY" || dur == "WEEK" || dur == "MONTH" || dur == "DAY_MALE" || dur == "DAY_FEMALE" || dur == "WEEK_ORIGINAL" || dur == "WEEK_ROOKIE" || dur == "DAY_MANGA") {
        duration = dur;
    } else {
        duration = "WEEK";
    }
    if (loginCredentials.expire_time === undefined || loginCredentials.expire_time + 60 < Math.floor(Date.now() / 1000)) { // If session invaild
        if (loginCredentials.refresh_token !== undefined) { // If have logged in before 
            pixNode.authenticate.refresh(loginCredentials.refresh_token, (rel, err) => { // Refresh current session
                if (err) {
                    res.send(err);
                }
                if (rel) returnRanklist(res, rel, duration, offset);
            })
        } else { // Throw error to login
            // res.status(500);
            res.send({
                code: 500,
                response: { message: "Login credentials invalid." }
            })
            throw `LoginError: run "npm login" first`;
        }
    } else { // Session vaild, return data
        returnRanklist(res, loginCredentials, duration, offset);
    }
})

/**
 * Tag ranklist
 */
app.get('/topInTag', (req, res) => {
    function returnTagRanklist(
        res: any,
        login: pixNode.types.loginCredential,
        keyword: string,
        duration?: "LAST_DAY" | "LAST_WEEK" | "LAST_MONTH" | undefined,
        offset?: number,
    ) {
        pixNode.fetch.searchForIllustration(login, keyword, { duration: duration, offset: offset, sort: "MALE_DESC" }, (rel: any, err: any) => {
            if (err) {
                res.send(err);
            } else res.send(rel);
        })
    }

    const offset = typeof req.query.offset === "string" ? parseInt(req.query.offset) : undefined;
    var dur = typeof req.query.duration == "string" ? req.query.duration : undefined;
    var duration: "LAST_DAY" | "LAST_WEEK" | "LAST_MONTH" | undefined;
    if (dur == "LAST_DAY" || dur == "LAST_WEEK" || dur == "LAST_MONTH") {
        duration = dur;
    } else {
        duration = "LAST_WEEK";
    }
    var keyword = "";
    if (req.query.keyword === undefined) {
        // res.status(400);
        res.send({
            code: 400,
            response: { message: "Please specificate a keyword." }
        });
        return;
    } else if (typeof req.query.keyword == "string") {
        keyword = req.query.keyword;
    } else {
        // res.status(400);
        res.send({
            code: 400,
            response: { message: `Please specificate a valid keyword (Recieved ${req.query.keyword}).` }
        });
        return;
    }
    if (loginCredentials.expire_time === undefined || loginCredentials.expire_time + 60 < Math.floor(Date.now() / 1000)) { // If session invaild
        if (loginCredentials.refresh_token !== undefined) { // If have logged in before 
            pixNode.authenticate.refresh(loginCredentials.refresh_token, (rel, err) => { // Refresh current session
                if (err) {
                    res.send(err);
                }
                if (rel) returnTagRanklist(res, rel, keyword, duration, offset);
            })
        } else { // Throw error to login
            // res.status(500);
            res.send({
                code: 500,
                response: { message: "Login credentials illegal." }
            })
            throw `LoginError: LoginError: run "npm login" first`;
        }
    } else { // Session vaild, return data
        returnTagRanklist(res, loginCredentials, keyword, duration, offset);
    }
})

app.get("/illustrationDetail", (req, res) => {
    function returnIllustrationDetail(
        res: any,
        login: pixNode.types.loginCredential,
        keyword: string
    ) {
        pixNode.fetch.illustration(login, keyword, (rel: any, err: any) => {
            if (err) {
                res.send(err);
            } else res.send(rel);
        })
    }

    var keyword = "";
    if (req.query.keyword === undefined) {
        // res.status(400);
        res.send({
            code: 400,
            response: { message: "Please specificate the illustration ID." }
        });
        return;
    } else if (typeof req.query.keyword == "string" && isNaN(parseInt(req.query.keyword)) == false) {
        keyword = req.query.keyword;
    } else {
        // res.status(400);
        res.send({
            code: 400,
            response: { message: `Please specificate a valid illustration ID (Recieved ${req.query.keyword})` }
        });
        return;
    }
    if (loginCredentials.expire_time === undefined || loginCredentials.expire_time + 60 < Math.floor(Date.now() / 1000)) { // If session invaild
        if (loginCredentials.refresh_token !== undefined) { // If have logged in before 
            pixNode.authenticate.refresh(loginCredentials.refresh_token, (rel, err) => { // Refresh current session
                if (err) {
                    res.send(err);
                }
                if (rel) returnIllustrationDetail(res, rel, keyword);
            })
        } else { // Throw error to login
            // res.status(500);
            res.send({
                code: 500,
                response: { message: "Login credentials illegal." }
            })
            throw `LoginError: run "npm login" first`
        }
    } else { // Session vaild, return data
        returnIllustrationDetail(res, loginCredentials, keyword);
    }
})

app.get("/creatorIllustrations", (req, res) => {
    function returncreatorIllustrations(
        res: any,
        login: pixNode.types.loginCredential,
        keyword: number,
        offset?: number
    ) {
        pixNode.fetch.userIllustrations(login, keyword, { contentType: "ILLUSTRATION", offset: offset }, (rel: any, err: any) => {
            if (err) {
                res.send(err);
            } else res.send(rel);
        })
    }

    var keyword: number;
    if (req.query.keyword === undefined) {
        // res.status(400);
        res.send({
            code: 400,
            response: { message: "Please specificate the illustration ID." }
        });
        return;
    } else if (typeof req.query.keyword == "string" && isNaN(parseInt(req.query.keyword)) == false) {
        keyword = parseInt(req.query.keyword);
    } else {
        // res.status(400);
        res.send({
            code: 400,
            response: { message: `Please specificate a valid illustration ID (Recieved ${req.query.keyword}).` }
        });
        return;
    }
    if (loginCredentials.expire_time === undefined || loginCredentials.expire_time + 60 < Math.floor(Date.now() / 1000)) { // If session invaild
        if (loginCredentials.refresh_token !== undefined) { // If have logged in before 
            pixNode.authenticate.refresh(loginCredentials.refresh_token, (rel, err) => { // Refresh current session
                if (err) {
                    res.send(err);
                }
                if (rel) returncreatorIllustrations(res, rel, keyword);
            })
        } else { // Throw error to login
            // res.status(500);
            res.send({
                code: 500,
                response: { message: "Login credentials illegal." }
            })
            throw `LoginError: run "npm login" first`
        }
    } else { // Session vaild, return data
        returncreatorIllustrations(res, loginCredentials, keyword);
    }
})

app.listen(port, () => {
    linkmap.log(`Server start listening on port ${port}`);
})
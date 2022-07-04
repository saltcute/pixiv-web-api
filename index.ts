import express = require('express');
const app = express();
const port = 8888;
import * as pixNode from 'pixnode';
import fs = require('fs');

var loginCredentials = JSON.parse(fs.readFileSync("./auth/loginCredentials.json", { encoding: 'utf-8', flag: 'r' }));
// var currentRanking = new Object();

/**
 * Get today's ranklist
 */
app.get('/ranklist', (req, res) => {
    function returnRanklist(
        res: any,
        login: pixNode.types.loginCredential,
        offset?: number
    ) {
        pixNode.fetch.illustrationRanking(login, { offset: offset, mode: "DAY" }, (rel, err) => {
            if (err) throw err;
            res.send(rel);
        })
    }

    const offset = typeof req.query.offset === 'number' ? req.query.offset : undefined;
    if (loginCredentials.expire_time === undefined || loginCredentials.expire_time + 60 < Math.floor(Date.now() / 1000)) { // If session invaild
        if (loginCredentials.refresh_token !== undefined) { // If have logged in before 
            pixNode.authenticate.refresh(loginCredentials.refresh_token, (rel, err) => { // Refresh current session
                if (err) throw err;
                returnRanklist(res, rel, offset);
            })
        } else { // Throw error to login
            res.send({
                code: 502,
                response: { message: "Login credentials invalid." }
            })
            throw `LoginError: run "npm login" first`;
        }
    } else { // Session vaild, return data
        returnRanklist(res, loginCredentials, offset);
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
        duration?: "LAST_DAY" | "LAST_DAY" | "LAST_WEEK" | "LAST_MONTH" | undefined,
        offset?: number,
    ) {
        pixNode.fetch.searchForIllustration(login, keyword, { duration: duration, offset: offset, sort: "MALE_DESC" }, (rel: any, err: any) => {
            if (err) throw err;
            res.send(rel);
        })
    }

    const offset = typeof req.query.offset === "string" ? parseInt(req.query.offset) : undefined;
    var keyword = "";
    if (req.query.keyword === undefined) {
        res.send({
            code: 502,
            response: { message: "Please specificate a keyword." }
        });
        return;
    } else if (typeof req.query.keyword == "string") {
        keyword = req.query.keyword;
    } else {
        res.send({
            code: 504,
            response: { message: "Please specificate a valid keyword." }
        });
        return;
    }
    if (loginCredentials.expire_time === undefined || loginCredentials.expire_time + 60 < Math.floor(Date.now() / 1000)) { // If session invaild
        if (loginCredentials.refresh_token !== undefined) { // If have logged in before 
            pixNode.authenticate.refresh(loginCredentials.refresh_token, (rel, err) => { // Refresh current session
                if (err) throw err;
                returnTagRanklist(res, rel, keyword, "LAST_DAY", offset);
            })
        } else { // Throw error to login
            res.send({
                code: 503,
                response: { message: "Login credentials illegal." }
            })
            throw `LoginError: LoginError: run "npm login" first`;
        }
    } else { // Session vaild, return data
        returnTagRanklist(res, loginCredentials, keyword, "LAST_DAY", offset);
    }
})

app.get("/illustrationDetail", (req, res) => {
    function returnIllustrationDetail(
        res: any,
        login: pixNode.types.loginCredential,
        keyword: string
    ) {
        pixNode.fetch.illustration(login, keyword, (rel: any, err: any) => {
            if (err) throw err;
            res.send(rel);
        })
    }

    const offset = typeof req.query.offset === "string" ? parseInt(req.query.offset) : undefined;
    var keyword = "";
    if (req.query.keyword === undefined) {
        res.send({
            code: 503,
            response: { message: "Please specificate the illustration ID." }
        });
        return;
    } else if (typeof req.query.keyword == "string" && isNaN(parseInt(req.query.keyword)) == false) {
        keyword = req.query.keyword;
    } else {
        res.send({
            code: 504,
            response: { message: "Please specificate a valid illustration ID." }
        });
        return;
    }
    if (loginCredentials.expire_time === undefined || loginCredentials.expire_time + 60 < Math.floor(Date.now() / 1000)) { // If session invaild
        if (loginCredentials.refresh_token !== undefined) { // If have logged in before 
            pixNode.authenticate.refresh(loginCredentials.refresh_token, (rel, err) => { // Refresh current session
                if (err) throw err;
                returnIllustrationDetail(res, rel, keyword);
            })
        } else { // Throw error to login
            res.send({
                code: 502,
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
            if (err) throw err;
            res.send(rel);
        })
    }

    var keyword: number;
    if (req.query.keyword === undefined) {
        res.send({
            code: 503,
            response: { message: "Please specificate the illustration ID." }
        });
        return;
    } else if (typeof req.query.keyword == "string" && isNaN(parseInt(req.query.keyword)) == false) {
        keyword = parseInt(req.query.keyword);
    } else {
        res.send({
            code: 504,
            response: { message: "Please specificate a valid illustration ID." }
        });
        return;
    }
    if (loginCredentials.expire_time === undefined || loginCredentials.expire_time + 60 < Math.floor(Date.now() / 1000)) { // If session invaild
        if (loginCredentials.refresh_token !== undefined) { // If have logged in before 
            pixNode.authenticate.refresh(loginCredentials.refresh_token, (rel, err) => { // Refresh current session
                if (err) throw err;
                returncreatorIllustrations(res, rel, keyword);
            })
        } else { // Throw error to login
            res.send({
                code: 502,
                response: { message: "Login credentials illegal." }
            })
            throw `LoginError: run "npm login" first`
        }
    } else { // Session vaild, return data
        returncreatorIllustrations(res, loginCredentials, keyword);
    }
})

app.listen(port, () => {
    console.log(`pixiv-web-api server listening on port ${port}`)
})
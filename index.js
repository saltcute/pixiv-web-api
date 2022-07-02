const express = require('express');
const app = express();
const port = 8888;

const fs = require('fs');
const pixNode = require('pixnode');
var loginCredentials = JSON.parse(fs.readFileSync("loginCredentials.json", {encoding: 'utf-8', flag: 'r'}));
// var currentRanking = new Object();


app.get('/', (req, res) => {
    let offset =  req.query.offset;
    if(loginCredentials.expire_time === undefined || loginCredentials.expire_time + 60 < Math.floor(Date.now() / 1000)) {
        if(loginCredentials.refresh_token !== undefined) {
            pixNode.authenticate.refresh(loginCredentials.refresh_token, (rel, err) => {
                if(err) throw err;
                pixNode.fetch.illustrationRanking(rel, {offset: offset, mode: "DAY"}, (rel, err) => {
                // pixNode.fetch.searchForIllustration(rel, "ロリ", {offset: offset}, (rel, err) => {
                    if(err) throw err;
                    res.send(rel);
                })
            })
        } else {
            res.send({
                code: 502,
                response: {message: "Login credentials illegal."}
            })
            throw `LoginError: Please run login.js first`
        }
    } else {
        // pixNode.fetch.illustrationRanking(loginCredentials, {offset: offset, mode: "DAY"}, (rel, err) => {
        pixNode.fetch.searchForIllustration(loginCredentials, "ロリ", {}, (rel, err) => {
            if(err) throw err;
            res.send(rel);
        })
    }
})

app.listen(port, () => {
    console.log(`pixiv-web-api listening on port ${port}`)
})
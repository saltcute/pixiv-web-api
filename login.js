const pixNode = require('pixnode');
const fs = require('fs');

pixNode.authenticate.login((res, err) => {
    if(err) throw err;
    fs.writeFileSync("loginCredentials.json", JSON.stringify(res));
})
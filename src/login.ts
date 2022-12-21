import * as pixNode from 'pixnode';
import * as fs from 'fs';
import { linkmap } from './linkmap';
import upath from 'upath';

pixNode.authenticate.login()
    .then((res) => {
        fs.writeFileSync(upath.join(__dirname, "/config/auth.json"), JSON.stringify(res));
    })
    .catch((err) => {
        linkmap.logger.fatal(err);
    })
import * as pixNode from 'pixnode';
import * as fs from 'fs';
import { linkmap } from './linkmap';

pixNode.authenticate.login()
    .then((res) => {
        fs.writeFileSync("./config/auth.json", JSON.stringify(res));
    })
    .catch((err) => {
        linkmap.logger.fatal(err);
    })
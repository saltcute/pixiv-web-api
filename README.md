# pixiv-web-api

## Usage

Based on express.js.

```sh
git clone https://github.com/potatopotat0/pixiv-web-api
cd ./pixiv-web-api
npm install
npm run login
```

Follow the instruction to login, and

```
npm start
```

A web server will start running on port 8888, or modify it yourself in `index.ts`.

`./generateKeys/` has an example of a key generator for Pixiv Chan.

## List of API (wiki WIP)

### Requires authorization

`POST` `/linkmap/update`

`POST` `/user/key/activate`

`POST` `/user/profile/update`

### Does not require authorization

`GET` `/linkmap`

`GET` `/user/profile/`

`GET` `/illustration/recommend`

`GET` `/illustration/ranklist`

`GET` `/illustration/tag`

`GET` `/illustration/detail`

`GET` `/illustration/creator`
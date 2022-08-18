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

## List of API (wiki WIP)

### Requires authorization


`POST` `/user/key/activate`

`POST` `/linkmap/update`

### Does not require authorization

`GET` `/user/profile/`

`GET` `/linkmap/get`

`GET` `/illustration/recommend`

`GET` `/illustration/ranklist`

`GET` `/illustration/tag`

`GET` `/illustration/detail`

`GET` `/illustration/creator`
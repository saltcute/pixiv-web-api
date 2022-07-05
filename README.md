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

Will start a web server on port 8888, or modify it yourself in `index.ts`.

## `/ranklist`

- type: `GET`

### query strings

- `offset`: What number the ranklist starts at
- `time`: Time period for the ranklist, the value could be 
  - `DAY`
  - `WEEK`
  - `MONTH`
  - `DAY_MALE`
  - `DAY_FEMALE`
  - `WEEK_ORIGINAL`
  - `WEEK_ROOKIE`
  - `DAY_MANGA`

## `/topInTag`

## `/illustrationDetail`

## `/creatorIllustrations`
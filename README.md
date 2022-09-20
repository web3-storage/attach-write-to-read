# attach-write-to-read

TODO

## Getting started

Uses [SST](https://sst.dev) to wrangle AWS infra. Ensure you are logged in to aws-cli locally then

```console
# install deps
$ npm i

# test it. Uses docker, check dag completeness over CARs in an S3
$ npm test -w services

# deploy dev infra
$ npm start
```

TODO

see: https://sst.dev/chapters/configure-the-aws-cli.html
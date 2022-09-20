# Gateway

TODO

## Getting started

TODO

## Environment setup

- Add secrets

  ```sh
    wrangler secret put SENTRY_DSN --env $(whoami) # Get from Sentry
    wrangler secret put LOKI_URL --env $(whoami) # Get from Loki
    wrangler secret put LOKI_TOKEN --env $(whoami) # Get from Loki
    wrangler secret put SECRET --env $(whoami) # open `https://csprng.xyz/v1/api` in the browser and use the value of `Data`
    wrangler secret put ATTACH_PULLER_SECRET --env $(whoami) # Get from 1password
  ```

- `pnpm run publish` - Publish the worker under desired env. An alias for `wrangler publish --env $(whoami)`

## Usage

### 🔒 `POST /`

```console

```

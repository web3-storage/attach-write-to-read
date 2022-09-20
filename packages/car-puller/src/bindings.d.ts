import Toucan from 'toucan-js'
import { Logging } from '@web3-storage/worker-utils/loki'

export {}

export interface EnvInput {
  ENV: string
  DEBUG: string
  SECRET: string
  CARPARK_URL: string
  SENTRY_DSN?: string
  LOKI_URL?: string
  LOKI_TOKEN?: string
  CARPARK: R2Bucket
}

export interface EnvTransformed {
  VERSION: string
  BRANCH: string
  COMMITHASH: string
  SENTRY_RELEASE: string
  sentry?: Toucan
  log: Logging
}

export type Env = EnvInput & EnvTransformed

declare global {
  const BRANCH: string
  const VERSION: string
  const COMMITHASH: string
  const SENTRY_RELEASE: string
  const ENV: string
}

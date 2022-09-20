/* eslint-env serviceworker */

import { JSONResponse } from '@web3-storage/worker-utils/response'
import pSettle from 'p-settle'

import {
  NoValidUrlError,
  NoValidContentTypeError
} from './errors.js'

const SECOND = 1000

// Batch 6
// Max Parallel requests from DO

/**
 * @typedef {{ value: { response: Response, carCid: string } }} PullCarResponse
 */

/**
 * * @implements {DurableObject}
 */
export class AttachPipelineQueue {
  /**
   * @param {DurableObjectState} state
   * @param {import('./env').Env} env
   */
  constructor (state, env) {
    this.state = state
    this.storage = state.storage
    this.env = env

    state.blockConcurrencyWhile(async () => {
      const vals = await this.storage.list({ reverse: true, limit: 1 })
      this.count = vals.size === 0 ? 0 : parseInt(vals.keys().next().value)
    })
  }

  /**
   * @param {Request} request
   */
  async fetch (request) {
    // Get pull body if valid
    const pullBody = await this._getPullBody(request)
    this.count += Object.keys(pullBody).length

    await this._setAlarm()
    await this.storage.put(pullBody)

    return new JSONResponse({
      queueId: this.state.id.toString(),
      n: this.state.id.name
    })
  }

  async alarm () {
    /** @type {Map<string,string>} */
    const pullObjs = await this.storage.list()

    /** @type {PullCarResponse[]} */
    // @ts-ignore Type 'PromiseRejectedResult' is missing values
    const pullResponses = await pSettle(
      Array.from(pullObjs).map(
        ([carCid, url]) => this._fetchCarPuller(carCid, url)
      )
    )

    const handledPullCars = pullResponses.filter(
      pullResponse => pullResponse.value.response.status === 200
    )

    // Use delete array
    await this.storage.delete(handledPullCars.map(
      pullResponse => pullResponse.value.carCid
    ))
    this.count -= handledPullCars.length

    // TODO: Should we track maximum failures and add to a Error KV?
    if (this.count) {
      await this._setAlarm()
    }
  }

  /**
   * @param {string} carCid
   * @param {string} url
   * @returns
   */
  async _fetchCarPuller (carCid, url) {
    const response = await fetch(
      (new URL(encodeURIComponent(url), this.env.CAR_PULLER_URL)).toString(),
      {
        headers: {
          Authorization: `Basic ${this.env.ATTACH_PULLER_SECRET}`
        }
      }
    )

    return {
      carCid,
      response
    }
  }

  /**
   * @param {Request} request
   */
  async _getPullBody (request) {
    // Validate content type and valid URLs
    if (!request.headers.get('content-type')?.includes('application/json')) {
      throw new NoValidContentTypeError()
    }

    const pullBody = await request.json()
    const urls = Object.values(pullBody)

    if (!urls.length) {
      throw new NoValidUrlError()
    }

    // Validate URL is valid
    try {
      urls.map(u => new URL(u))
    } catch (err) {
      throw new NoValidUrlError()
    }

    return pullBody
  }

  async _setAlarm () {
    // If there is no alarm currently set, set one for 5 seconds from now
    // Any further POSTs in the next 5 seconds will be part of this batch.
    const currentAlarm = await this.storage.getAlarm()
    if (currentAlarm == null) {
      const timeout = this.env.ALARM_TIMEOUT || 5 * SECOND
      this.storage.setAlarm(Date.now() + timeout)
    }
  }
}

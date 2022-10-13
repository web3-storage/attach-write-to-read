/* eslint-env serviceworker */
import { JSONResponse } from '@web3-storage/worker-utils/response'

import {
  NoValidUrlError,
  NoSuccessResponseError,
  NoSuccessMd5WriteError
} from './errors.js'

/**
 * Handle queue Post.
 *
 * @param {Request} request
 * @param {import('./env').Env} env
 */
export async function carPullPost (request, env) {
  // GET URL
  // @ts-ignore params in request
  const urlString = decodeURIComponent(request.params.url)
  if (!urlString) {
    throw new NoValidUrlError('No CAR url provided to fetch')
  }

  let url
  try {
    url = new URL(urlString)
  } catch (err) {
    throw new NoValidUrlError('CAR url provided is not valid')
  }

  // TODO: head r2?

  // Pull HTTP Response from provided URL
  const response = await fetch(urlString)
  if (!response.ok) {
    throw new NoSuccessResponseError(
      `Failed to get response from provided URL ${response.status}`
    )
  }

  // Get md5 hash to use to check the received object’s integrity.
  // https://docs.aws.amazon.com/AmazonS3/latest/API/RESTCommonResponseHeaders.html
  const md5 = response.headers.get('ETag') || undefined

  // Get CAR key name in format `carCid/carCid`
  const r2Key = url.pathname.substring(1)

  // Store in R2
  // TODO: What to do if no md5 received?
  try {
    await env.CARPARK.put(r2Key, response.body, {
      httpMetadata: response.headers,
      md5: md5 && md5.replaceAll('"', '')
    })
  } catch (/** @type {any} */ err) {
    if (err.message.includes('The Content-MD5 you specified did not match what we received.')) {
      throw new NoSuccessMd5WriteError()
    }
    throw err
  }

  return new JSONResponse({
    url: `${env.CARPARK_URL}/${r2Key}`
  })
}

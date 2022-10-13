import { createFetchMock } from '@miniflare/core'
import { Request } from 'miniflare'
import { concat, equals } from 'uint8arrays'
import md5 from 'md5'

import { test, getMiniflare, createTestToken } from './utils/setup.js'

test.beforeEach(async (t) => {
  const fetchMock = createFetchMock()
  const token = await createTestToken()
  const mf = getMiniflare({ fetchMock })

  t.context = {
    mf,
    token,
    fetchMock
  }
})

test('car-puller errors if invalid URL is provided', async (t) => {
  const { mf, token } = t.context
  if (!token) throw new Error()

  const invalidUrl = 'invalid_url'
  const response = await mf.dispatchFetch(
    new Request(`http://localhost:8787/${encodeURIComponent(invalidUrl)}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`
      }
    })
  )

  t.is(response.status, 400)
})

test('car-puller errors if it cannot pull from given URL', async (t) => {
  const { mf, token, fetchMock } = t.context
  if (!token || !fetchMock) throw new Error()

  const url = 'https://cars.s3.amazonaws.com/bagbaiera22227qz2m5rgyuw6ok5mxui7daacloos3kfyynuqxqa3svguhp4a/bagbaiera22227qz2m5rgyuw6ok5mxui7daacloos3kfyynuqxqa3svguhp4a.car'
  const linkdexMock = fetchMock.get('https://cars.s3.amazonaws.com')
  linkdexMock
    .intercept({ path: /car$/, method: 'GET' })
    .reply(500)

  const response = await mf.dispatchFetch(
    new Request(`http://localhost:8787/${encodeURIComponent(url)}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`
      }
    })
  )

  t.is(response.status, 404)
})

test('car-puller errors if it cannot write pulled content into R2 due to md5 error', async (t) => {
  const { mf, token, fetchMock } = t.context
  if (!token || !fetchMock) throw new Error()

  const value = Buffer.from('hello world')

  const url = 'https://cars.s3.amazonaws.com/bagbaiera22227qz2m5rgyuw6ok5mxui7daacloos3kfyynuqxqa3svguhp4a/bagbaiera22227qz2m5rgyuw6ok5mxui7daacloos3kfyynuqxqa3svguhp4a.car'
  const linkdexMock = fetchMock.get('https://cars.s3.amazonaws.com')
  linkdexMock
    .intercept({ path: /car$/, method: 'GET' })
    .reply(200, value, {
      headers: {
        'content-type': 'application/json',
        Etag: '37e7f6d6b5abd9b7b25adcd166ebf07f' // invalid md5
      }
    })

  const response = await mf.dispatchFetch(
    new Request(`http://localhost:8787/${encodeURIComponent(url)}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`
      }
    })
  )

  t.is(response.status, 400)
})

test('car-puller can pull from given CAR url and write to R2', async (t) => {
  const { mf, token, fetchMock } = t.context
  if (!token || !fetchMock) throw new Error()

  const value = Buffer.from('hello world')

  const url = 'https://cars.s3.amazonaws.com/bagbaiera22227qz2m5rgyuw6ok5mxui7daacloos3kfyynuqxqa3svguhp4a/bagbaiera22227qz2m5rgyuw6ok5mxui7daacloos3kfyynuqxqa3svguhp4a.car'
  const key = new URL(url).pathname.substring(1)
  const linkdexMock = fetchMock.get('https://cars.s3.amazonaws.com')
  linkdexMock
    .intercept({ path: /car$/, method: 'GET' })
    .reply(200, value, {
      headers: {
        'content-type': 'application/json',
        Etag: md5(value)
      }
    })

  const response = await mf.dispatchFetch(
    new Request(`http://localhost:8787/${encodeURIComponent(url)}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`
      }
    })
  )
  t.is(response.status, 200)

  // Validate URL
  const responseBody = await response.json()
  t.is(responseBody.url, `https://localhost:9000/${key}`)

  // Validate R2 bucket
  const bucket = await mf.getR2Bucket('CARPARK')
  const bucketResponse = await bucket.get(key)

  if (!bucketResponse?.body) {
    throw new Error()
  }

  const sameBytes = await assertSameBytes(bucketResponse?.body, value)
  t.is(sameBytes, true)
})

/**
 * @param {AsyncIterable<Uint8Array>} stream
 * @param {Uint8Array} carBytes
 **/
async function assertSameBytes (stream, carBytes) {
  const chunks = []
  // @ts-ignore
  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return equals(
    concat(chunks),
    carBytes
  )
}

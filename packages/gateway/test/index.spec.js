import { createFetchMock } from '@miniflare/core'
import { Request } from 'miniflare'
import delay from 'delay'
import pWaitFor from 'p-wait-for'

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

test('gateway errors if invalid content is provided', async (t) => {
  const { mf, token } = t.context
  if (!token) throw new Error()

  const response = await mf.dispatchFetch(
    new Request('http://localhost:8787', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`,
        'content-type': 'text/html; charset=utf-8'
      }
    })
  )
  t.is(response.status, 400)
})

test('gateway errors if invalid URL is provided', async (t) => {
  const { mf, token } = t.context
  if (!token) throw new Error()

  const cars = {
    bafy0: 'https://cars.s3.amazonaws.com/bafy0/bafy0.car',
    bafy1: 'invalid_url'
  }

  const response = await mf.dispatchFetch(
    new Request('http://localhost:8787', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`,
        'content-type': 'text/html; charset=utf-8'
      },
      body: JSON.stringify(cars)
    })
  )
  t.is(response.status, 400)
})

test('Gateway triggers car-puller', async (t) => {
  const { mf, token, fetchMock } = t.context
  if (!token || !fetchMock) throw new Error()

  const cars = {
    bafy0: 'https://cars.s3.amazonaws.com/bafy0/bafy0.car',
    bafy1: 'https://cars.s3.amazonaws.com/bafy1/bafy1.car',
    bafy2: 'https://cars.s3.amazonaws.com/bafy2/bafy2.car'
  }

  const pullMock = fetchMock.get('https://attach-puller.web3.storage')
  pullMock
    .intercept({ path: /car$/, method: 'GET' })
    .reply(200, new Uint8Array([1]), { headers: { 'content-type': 'application/json' } })
    .persist()

  const response = await mf.dispatchFetch(
    new Request('http://localhost:8787', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`,
        'content-type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(cars)
    })
  )
  t.is(response.status, 200)

  const gatewayResponse = await response.json()
  t.assert(gatewayResponse.queueId, 'queue id must be provided')

  // Validate storage
  const ns = await mf.getDurableObjectNamespace('ATTACH_PIPELINE_QUEUE')
  const id = ns.idFromString(gatewayResponse.queueId)
  const doStorage = await mf.getDurableObjectStorage(id)

  const preAlertList = await doStorage.list()
  t.is(preAlertList.size, Object.keys(cars).length)

  const alarm = await doStorage.getAlarm()

  const now = Date.now()
  if (alarm && alarm > now) {
    await delay(alarm - now)
  }

  // Await until alert is triggered
  await pWaitFor(
    async () => {
      const postAlertList = await doStorage.list()
      return postAlertList.size === 0
    }
  )
})

test('Gateway triggers car-puller, retrying failures', async (t) => {
  const { mf, token, fetchMock } = t.context
  if (!token || !fetchMock) throw new Error()

  const cars = {
    bafy0: 'https://cars.s3.amazonaws.com/bafy0/bafy0.car',
    bafy1: 'https://cars.s3.amazonaws.com/bafy1/bafy1.car',
    bafy2: 'https://cars.s3.amazonaws.com/bafy2/bafy2.car'
  }

  const pullMock = fetchMock.get('https://attach-puller.web3.storage')
  // Mock 0.car and 1.car to succeed, and persist fail on 2.car
  pullMock
    .intercept({ path: /0.car$/, method: 'GET' })
    .reply(200, new Uint8Array([1]), { headers: { 'content-type': 'application/json' } })
  pullMock
    .intercept({ path: /1.car$/, method: 'GET' })
    .reply(200, new Uint8Array([1]), { headers: { 'content-type': 'application/json' } })
  pullMock
    .intercept({ path: /2.car$/, method: 'GET' })
    .reply(500)
    .times(3)

  const response = await mf.dispatchFetch(
    new Request('http://localhost:8787', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`,
        'content-type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(cars)
    })
  )
  t.is(response.status, 200)

  const gatewayResponse = await response.json()
  t.assert(gatewayResponse.queueId, 'queue id must be provided')

  // Validate storage
  const ns = await mf.getDurableObjectNamespace('ATTACH_PIPELINE_QUEUE')
  const id = ns.idFromString(gatewayResponse.queueId)
  const doStorage = await mf.getDurableObjectStorage(id)

  const preAlertList = await doStorage.list()
  t.is(preAlertList.size, Object.keys(cars).length)

  const alarm = await doStorage.getAlarm()

  const now = Date.now()
  if (alarm && alarm > now) {
    await delay(alarm - now)
  }

  // Await until alert is triggered and first two succeed
  await pWaitFor(
    async () => {
      const postAlertList = await doStorage.list()
      return postAlertList.size === 1
    }
  )

  // Make car 2 succeed after a few retries
  pullMock
    .intercept({ path: /2.car$/, method: 'GET' })
    .reply(200, new Uint8Array([1]), { headers: { 'content-type': 'application/json' } })
    .persist()

  // Await until more alert is triggered and third car succeeds
  await pWaitFor(
    async () => {
      const postAlertList = await doStorage.list()
      return postAlertList.size === 0
    }
  )
})

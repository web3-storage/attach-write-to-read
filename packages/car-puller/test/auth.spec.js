import {
  test,
  createTestToken,
  getMiniflare
} from './utils/setup.js'

test.beforeEach(async (t) => {
  // Create a new Miniflare environment for each test
  t.context = {
    mf: getMiniflare()
  }
})

test('Fails with 401 authentication when no token provided', async (t) => {
  const { mf } = t.context

  const url = 'https://cars.s3.amazonaws.com/bagbaiera22227qz2m5rgyuw6ok5mxui7daacloos3kfyynuqxqa3svguhp4a/bagbaiera22227qz2m5rgyuw6ok5mxui7daacloos3kfyynuqxqa3svguhp4a.car'
  const response = await mf.dispatchFetch(`http://localhost:8787/${encodeURIComponent(url)}`, {
    method: 'POST'
  })
  t.is(response.status, 401)
})

test('Fails with 401 authentication when invalid token provided', async (t) => {
  const { mf } = t.context
  const token = await createTestToken()

  const url = 'https://cars.s3.amazonaws.com/bagbaiera22227qz2m5rgyuw6ok5mxui7daacloos3kfyynuqxqa3svguhp4a/bagbaiera22227qz2m5rgyuw6ok5mxui7daacloos3kfyynuqxqa3svguhp4a.car'
  const response = await mf.dispatchFetch(`http://localhost:8787/${encodeURIComponent(url)}`, {
    method: 'POST',
    headers: { Authorization: `${token}` } // Not Basic /token/
  })
  t.is(response.status, 401)
})

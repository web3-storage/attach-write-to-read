/* eslint-env serviceworker */

import { Router } from 'itty-router'

import { queuePost } from './handlers.js'
import { versionGet } from './version.js'

import { withAuthToken } from './auth.js'
import { addCorsHeaders, withCorsHeaders } from './cors.js'
import { errorHandler } from './error-handler.js'
import { envAll } from './env.js'

// https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent
/** @typedef {{ waitUntil(p: Promise<any>): void }} Ctx */

const router = Router()

const auth = {
  '🤲': (/** @type {import("itty-router").RouteHandler<Request>} */ handler) => withCorsHeaders(handler),
  '🔒': (/** @type {import("itty-router").RouteHandler<Request>} */ handler) => withCorsHeaders(withAuthToken(handler))
}

router
  .all('*', envAll)
  .get('/version', auth['🤲'](versionGet))
  .post('/', auth['🔒'](queuePost))

/**
 * @param {Error} error
 * @param {Request} request
 * @param {import('./env').Env} env
 */
function serverError (error, request, env) {
  return addCorsHeaders(request, errorHandler(error, env))
}

export default {
  /**
   *
   * @param {Request} request
   * @param {import("./bindings").Env} env
   * @param {Ctx} ctx
   */
  async fetch (request, env, ctx) {
    try {
      const res = await router.handle(request, env, ctx)
      env.log.timeEnd('request')
      return env.log.end(res)
    } catch (/** @type {any} */ error) {
      if (env.log) {
        env.log.timeEnd('request')
        return env.log.end(serverError(error, request, env))
      }
      return serverError(error, request, env)
    }
  }
}

export { AttachPipelineQueue as AttachPipelineQueue0 } from './queue.js'

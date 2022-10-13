
/**
 * Handle queue Post.
 *
 * @param {Request} request
 * @param {import('./env').Env} env
 */
export async function queuePost (request, env) {
  const id = env.ATTACH_PIPELINE_QUEUE.newUniqueId()
  return await env.ATTACH_PIPELINE_QUEUE.get(id).fetch(request)
}

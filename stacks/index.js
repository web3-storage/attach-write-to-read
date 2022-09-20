import { App } from '@serverless-stack/resources'
import { CarPutEventProcessorStack } from './CarPutEventProcessorStack'

/**
 * @param {App} app
 */
 export default function (app) {
  app.setDefaultFunctionProps({
    runtime: "nodejs16.x",
    srcPath: "services",
    bundle: {
      format: "esm",
    },
  });
  app.stack(CarPutEventProcessorStack);
}

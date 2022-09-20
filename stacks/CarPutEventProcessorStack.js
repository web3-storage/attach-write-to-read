import { EventBus, Queue, Bucket } from '@serverless-stack/resources'

/**
 * 
 * @param {import('@serverless-stack/resources').StackContext} context
 */
export function CarPutEventProcessorStack ({ stack }) {
  const eventQueue = new Queue(stack, 'CarPutEventQueue', {
    consumer: 'functions/carPutConsumer.main',
    cdk: {
      queue: {
        fifo: true
      }
    }
  })
  const eventBus = new EventBus(stack, 'CarPutEventBus', {
    rules: {
      carPutRule: {
        pattern: {
          source: ['todo-event']
        },
        targets: {
          attachPipeline: eventQueue
        }
      }
    }
  })

  // Allow all targets in the event bus to access S3
  eventBus.attachPermissions(["s3"])

  const temporaryBucket = new Bucket(stack, 'Bucket', {
    notifications: {
      carPutEvent: eventQueue
    }
  })

  // Show the endpoint in the output
  stack.addOutputs({
    QueueURL: eventQueue.queueUrl
  })

  return {
    eventQueue,
    eventBus
  }
}

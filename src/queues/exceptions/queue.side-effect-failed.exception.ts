import { QueueException } from '@queues/exceptions/queue.exception';

/** @public */
export class QueueSideEffectFailedException extends QueueException {
    constructor(
        readonly description: string,
        readonly rawError: unknown
    ) {
        super(description, true, rawError);
    }
}

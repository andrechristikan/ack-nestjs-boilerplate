import { QueueException } from '@queues/exceptions/queue.exception';

/**
 * Raised when a post-commit side effect (an enqueue) rejects; the caller's error rides in `rawError` and `description` names the effect.
 * @public
 */
export class QueueSideEffectFailedException extends QueueException {
    constructor(
        readonly description: string,
        readonly rawError: unknown
    ) {
        super(description, true, rawError);
    }
}

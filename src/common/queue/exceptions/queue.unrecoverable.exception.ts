import { QueueException } from '@common/queue/exceptions/queue.exception';

/** @public */
export class QueueUnrecoverableException extends QueueException {
    constructor(
        override readonly message: string,
        override readonly isFatal: boolean = true,
        override readonly rawError: unknown = null
    ) {
        super(message, isFatal, rawError);
    }
}

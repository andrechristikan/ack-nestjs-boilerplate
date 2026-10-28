/**
 * Job failure that carries whether it is fatal for Sentry reporting.
 * @public
 */
export class QueueException extends Error {
    constructor(
        readonly message: string,
        readonly isFatal: boolean = false,
        readonly rawError: unknown = null
    ) {
        super(message);
    }
}

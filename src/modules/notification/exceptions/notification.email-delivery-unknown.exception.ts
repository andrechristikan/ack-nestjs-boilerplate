import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

/**
 * Raised when an email batch ends with recipients whose delivery outcome is unknown; they stay claimed and are never re-sent.
 * @public
 */
export class NotificationEmailDeliveryUnknownException extends AppUnknownException {
    constructor(
        batchId: string,
        unknownCount: number,
        rawError: unknown = null
    ) {
        super(
            rawError,
            `Email batch ${batchId} has ${unknownCount} recipients with an unknown delivery outcome`
        );
    }
}

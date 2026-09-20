import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';

/**
 * Raised when a notification setting names a channel its type disallows.
 * @public
 */
export class NotificationInvalidChannelException extends AppBaseException {
    readonly module = 'notification';
    readonly statusCode = EnumNotificationStatusCodeError.invalidChannel;
    readonly statusCodeKey = EnumNotificationStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('notification.error.invalidChannel');
    }
}

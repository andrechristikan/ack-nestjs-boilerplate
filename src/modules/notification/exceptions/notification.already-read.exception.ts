import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';

/**
 * Raised when a notification is already marked as read.
 * @public
 */
export class NotificationAlreadyReadException extends AppBaseException {
    readonly module = 'notification';
    readonly statusCode = EnumNotificationStatusCodeError.alreadyRead;
    readonly statusCodeKey = EnumNotificationStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('notification.error.alreadyRead');
    }
}

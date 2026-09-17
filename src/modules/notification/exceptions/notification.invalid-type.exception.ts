import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';

/**
 * Raised when a notification setting names an invalid type.
 * @public
 */
export class NotificationInvalidTypeException extends AppBaseException {
    readonly module = 'notification';
    readonly statusCode = EnumNotificationStatusCodeError.invalidType;
    readonly statusCodeKey = EnumNotificationStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.BAD_REQUEST;

    constructor() {
        super('notification.error.invalidType');
    }
}

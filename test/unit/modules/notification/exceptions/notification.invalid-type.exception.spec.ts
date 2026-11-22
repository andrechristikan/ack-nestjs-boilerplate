import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';
import { NotificationInvalidTypeException } from '@modules/notification/exceptions/notification.invalid-type.exception';

describe('NotificationInvalidTypeException', () => {
    describe('constructor', () => {
        it('declares the notification module contract for an invalid type', () => {
            const exception = new NotificationInvalidTypeException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.invalidType,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.invalidType
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'notification.error.invalidType',
            });
        });
    });
});

import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';
import { NotificationAlreadyReadException } from '@modules/notification/exceptions/notification.already-read.exception';

describe('NotificationAlreadyReadException', () => {
    describe('constructor', () => {
        it('declares the notification module contract for an already-read notification', () => {
            const exception = new NotificationAlreadyReadException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.alreadyRead,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.alreadyRead
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'notification.error.alreadyRead',
            });
        });
    });
});

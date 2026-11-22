import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';
import { NotificationNotFoundException } from '@modules/notification/exceptions/notification.not-found.exception';

describe('NotificationNotFoundException', () => {
    describe('constructor', () => {
        it('declares the notification module contract for a missing notification', () => {
            const exception = new NotificationNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.notFound,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'notification.error.notFound',
            });
        });
    });
});

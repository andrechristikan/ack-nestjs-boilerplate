import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';
import { NotificationInvalidChannelException } from '@modules/notification/exceptions/notification.invalid-channel.exception';

describe('NotificationInvalidChannelException', () => {
    describe('constructor', () => {
        it('declares the notification module contract for a disallowed channel', () => {
            const exception = new NotificationInvalidChannelException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.invalidChannel,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.invalidChannel
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'notification.error.invalidChannel',
            });
        });
    });
});

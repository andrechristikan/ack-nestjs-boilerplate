import { HttpStatus } from '@nestjs/common';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { NotificationEmailDeliveryUnknownException } from '@modules/notification/exceptions/notification.email-delivery-unknown.exception';

describe('NotificationEmailDeliveryUnknownException', () => {
    describe('constructor', () => {
        it('declares the app unknown contract naming the batch and the unknown count', () => {
            const exception = new NotificationEmailDeliveryUnknownException(
                'batch-id',
                2
            );

            expect(exception).toBeInstanceOf(AppUnknownException);
            expect(exception).toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'http.serverError.internalServerError',
                message:
                    'Email batch batch-id has 2 recipients with an unknown delivery outcome',
                rawError: null,
            });
        });

        it('chains the error that made the outcome unknown', () => {
            const cause = new Error('socket hang up');
            const exception = new NotificationEmailDeliveryUnknownException(
                'batch-id',
                2,
                cause
            );

            expect(exception).toMatchObject({ rawError: cause, cause });
        });
    });
});

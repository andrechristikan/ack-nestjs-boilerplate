import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumNotificationStatusCodeError } from '@modules/notification/enums/notification.status-code.enum';
import { NotificationSettingInvalidException } from '@modules/notification/exceptions/notification.setting-invalid.exception';

describe('NotificationSettingInvalidException', () => {
    describe('constructor', () => {
        it('declares the notification module contract for a setting that cannot be written', () => {
            const exception = new NotificationSettingInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'notification',
                statusCode: EnumNotificationStatusCodeError.settingInvalid,
                statusCodeKey:
                    EnumNotificationStatusCodeError[
                        EnumNotificationStatusCodeError.settingInvalid
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'notification.error.settingInvalid',
            });
        });
    });
});

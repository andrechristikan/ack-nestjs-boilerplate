import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumDeviceStatusCodeError } from '@modules/device/enums/device.status-code.enum';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';

describe('DeviceNotFoundException', () => {
    describe('constructor', () => {
        it('declares the device module contract for a missing ownership', () => {
            const exception = new DeviceNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'device',
                statusCode: EnumDeviceStatusCodeError.notFound,
                statusCodeKey:
                    EnumDeviceStatusCodeError[
                        EnumDeviceStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'device.error.notFound',
            });
        });
    });
});

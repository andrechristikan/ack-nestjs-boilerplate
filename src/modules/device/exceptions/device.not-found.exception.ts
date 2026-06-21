import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumDeviceStatusCodeError } from '@modules/device/enums/device.status-code.enum';

export class DeviceNotFoundException extends AppBaseException {
    readonly module = 'device';
    readonly statusCode = EnumDeviceStatusCodeError.notFound;
    readonly statusCodeKey = EnumDeviceStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;

    constructor() {
        super('device.error.notFound');
    }
}

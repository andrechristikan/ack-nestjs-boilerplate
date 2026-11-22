import type { HttpStatus } from '@nestjs/common';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

export function buildStatusException(
    httpStatus: HttpStatus
): AppUnknownException {
    return Object.defineProperties(new AppUnknownException(null), {
        httpStatus: { value: httpStatus },
        statusCode: { value: 12345 },
        statusCodeKey: { value: 'statusKey' },
    });
}

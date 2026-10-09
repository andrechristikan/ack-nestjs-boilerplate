import { HttpStatus } from '@nestjs/common';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { RequestThrottleResponseInvalidException } from '@common/request/exceptions/request.throttle-response-invalid.exception';

describe('RequestThrottleResponseInvalidException', () => {
    describe('constructor', () => {
        it('declares the app unknown contract with its description as message', () => {
            const exception = new RequestThrottleResponseInvalidException([
                1,
                'x',
            ]);

            expect(exception).toBeInstanceOf(AppUnknownException);
            expect(exception).toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'http.serverError.internalServerError',
                message: 'Invalid Redis throttle response: [1,"x"]',
                rawError: [1, 'x'],
            });
        });
    });
});

import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestEnvForbiddenException } from '@common/request/exceptions/request.env-forbidden.exception';

describe('RequestEnvForbiddenException', () => {
    describe('constructor', () => {
        it('declares the request module contract for a route called outside its allowed environments', () => {
            const exception = new RequestEnvForbiddenException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.envForbidden,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.envForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'http.clientError.forbidden',
            });
        });
    });
});

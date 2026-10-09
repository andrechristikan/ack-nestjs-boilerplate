import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestEnvNotAllowedException } from '@common/request/exceptions/request.env-not-allowed.exception';

describe('RequestEnvNotAllowedException', () => {
    describe('constructor', () => {
        it('declares the request module contract for a route called outside its allowed environments', () => {
            const exception = new RequestEnvNotAllowedException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.envNotAllowed,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.envNotAllowed
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'http.clientError.notFound',
            });
        });
    });
});

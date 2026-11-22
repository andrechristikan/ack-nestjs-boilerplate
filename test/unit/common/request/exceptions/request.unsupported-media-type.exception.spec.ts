import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestUnsupportedMediaTypeException } from '@common/request/exceptions/request.unsupported-media-type.exception';

describe('RequestUnsupportedMediaTypeException', () => {
    describe('constructor', () => {
        it('declares the request module contract for a body with an unsupported encoding or media type', () => {
            const exception = new RequestUnsupportedMediaTypeException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.unsupportedMediaType,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.unsupportedMediaType
                    ],
                httpStatus: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                messagePath: 'request.error.unsupportedMediaType',
            });
        });
    });
});

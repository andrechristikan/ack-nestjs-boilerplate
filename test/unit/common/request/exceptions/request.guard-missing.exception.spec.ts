import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestGuardMissingException } from '@common/request/exceptions/request.guard-missing.exception';

describe('RequestGuardMissingException', () => {
    describe('constructor', () => {
        it('declares the request module contract for a missing guard store', () => {
            const exception = new RequestGuardMissingException('UserStoreKey');

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.guardMissing
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'request.error.guardMissing',
            });
            expect(exception.statusCode).toBe(50305);
        });

        it('names the missing store key in the description inside rawError', () => {
            const exception = new RequestGuardMissingException('UserStoreKey');

            expect(exception.rawError).toBeInstanceOf(AppUnknownException);
            expect((exception.rawError as AppUnknownException).message).toBe(
                'RequestGuardMissingException: no guard wrote "UserStoreKey"'
            );
        });
    });
});

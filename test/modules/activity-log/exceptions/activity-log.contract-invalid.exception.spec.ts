import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumActivityLogStatusCodeError } from '@modules/activity-log/enums/activity-log.status-code.enum';
import { ActivityLogContractInvalidException } from '@modules/activity-log/exceptions/activity-log.contract-invalid.exception';

describe('ActivityLogContractInvalidException', () => {
    describe('constructor', () => {
        it('declares the activity-log module contract with no raw error', () => {
            const exception = new ActivityLogContractInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'activityLog.error.contractInvalid',
            });
            expect(exception.rawError).toBeUndefined();
        });

        it('carries the raw error when one is given', () => {
            const rawError = new Error('zod validation failed');

            const exception = new ActivityLogContractInvalidException(rawError);

            expect(exception).toMatchObject({
                module: 'activityLog',
                statusCode: EnumActivityLogStatusCodeError.contractInvalid,
                statusCodeKey:
                    EnumActivityLogStatusCodeError[
                        EnumActivityLogStatusCodeError.contractInvalid
                    ],
                messagePath: 'activityLog.error.contractInvalid',
            });
            expect(exception.rawError).toBe(rawError);
        });
    });
});

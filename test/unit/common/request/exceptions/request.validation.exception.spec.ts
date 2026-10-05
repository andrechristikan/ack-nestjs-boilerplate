import { HttpStatus } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';

describe('RequestValidationException', () => {
    describe('constructor', () => {
        const issues: readonly StandardSchemaV1.Issue[] = [
            { message: 'Required', path: ['email'] },
        ];

        it('declares the request module contract for a Standard Schema validation failure', () => {
            const exception = new RequestValidationException(issues);

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.validation,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.validation
                    ],
                httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
                messagePath: 'request.error.validation',
            });
        });

        it('carries the given issues', () => {
            const exception = new RequestValidationException(issues);

            expect(exception.issues).toBe(issues);
        });
    });
});

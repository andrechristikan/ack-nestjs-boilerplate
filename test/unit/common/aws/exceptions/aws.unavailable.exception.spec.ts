import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsUnavailableException } from '@common/aws/exceptions/aws.unavailable.exception';

describe('AwsUnavailableException', () => {
    describe('constructor', () => {
        it('declares the aws module contract for an unreachable S3 or SES', () => {
            const exception = new AwsUnavailableException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'aws',
                statusCode: 51408,
                statusCodeKey: 'unavailable',
                httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                messagePath: 'aws.error.unavailable',
                rawError: null,
            });
            expect(exception.statusCode).toBe(
                EnumAwsStatusCodeError.unavailable
            );
        });

        it('carries the caught error as rawError and cause', () => {
            const error = new Error('connect ECONNREFUSED');

            const exception = new AwsUnavailableException(error);

            expect(exception).toMatchObject({
                rawError: error,
                cause: error,
            });
        });
    });
});

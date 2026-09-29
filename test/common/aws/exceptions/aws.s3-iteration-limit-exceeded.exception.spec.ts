import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsS3IterationLimitExceededException } from '@common/aws/exceptions/aws.s3-iteration-limit-exceeded.exception';

describe('AwsS3IterationLimitExceededException', () => {
    describe('constructor', () => {
        it('declares the aws module contract for an exhausted delete-dir iteration budget', () => {
            const exception = new AwsS3IterationLimitExceededException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3IterationLimitExceeded,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.s3IterationLimitExceeded
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'aws.error.s3IterationLimitExceeded',
            });
        });
    });
});

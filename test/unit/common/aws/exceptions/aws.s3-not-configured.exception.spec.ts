import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsS3NotConfiguredException } from '@common/aws/exceptions/aws.s3-not-configured.exception';

describe('AwsS3NotConfiguredException', () => {
    describe('constructor', () => {
        it('declares the aws module contract for an S3 integration that is not configured', () => {
            const exception = new AwsS3NotConfiguredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.s3NotConfigured
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'aws.error.s3NotConfigured',
            });
        });
    });
});

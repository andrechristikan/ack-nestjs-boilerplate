import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsS3FileRequiredException } from '@common/aws/exceptions/aws.s3-file-required.exception';

describe('AwsS3FileRequiredException', () => {
    describe('constructor', () => {
        it('declares the aws module contract for a missing upload file', () => {
            const exception = new AwsS3FileRequiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3FileRequired,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.s3FileRequired
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'aws.error.s3FileRequired',
            });
        });
    });
});

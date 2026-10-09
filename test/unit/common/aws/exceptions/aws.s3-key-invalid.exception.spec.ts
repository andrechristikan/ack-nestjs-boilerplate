import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsS3KeyInvalidException } from '@common/aws/exceptions/aws.s3-key-invalid.exception';

describe('AwsS3KeyInvalidException', () => {
    describe('constructor', () => {
        it('declares the aws module contract for an invalid S3 key', () => {
            const exception = new AwsS3KeyInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3KeyInvalid,
                statusCodeKey:
                    EnumAwsStatusCodeError[EnumAwsStatusCodeError.s3KeyInvalid],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'aws.error.s3KeyInvalid',
            });
        });
    });
});

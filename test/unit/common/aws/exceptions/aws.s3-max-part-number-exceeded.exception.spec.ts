import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsS3MaxPartNumberExceededException } from '@common/aws/exceptions/aws.s3-max-part-number-exceeded.exception';

describe('AwsS3MaxPartNumberExceededException', () => {
    describe('constructor', () => {
        it('declares the aws module contract for a multipart upload exceeding the max part number', () => {
            const exception = new AwsS3MaxPartNumberExceededException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3MaxPartNumberExceeded,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.s3MaxPartNumberExceeded
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'aws.error.s3MaxPartNumberExceeded',
            });
        });
    });
});

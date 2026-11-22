import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsS3ObjectExistException } from '@common/aws/exceptions/aws.s3-object-exist.exception';

describe('AwsS3ObjectExistException', () => {
    describe('constructor', () => {
        it('declares the aws module contract for a key that already holds an object', () => {
            const exception = new AwsS3ObjectExistException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3ObjectExist,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.s3ObjectExist
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'aws.error.s3ObjectExist',
            });
        });
    });
});

import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsServiceUnavailableException } from '@common/aws/exceptions/aws.service-unavailable.exception';

describe('AwsServiceUnavailableException', () => {
    describe('constructor', () => {
        it('declares the aws module contract for an unavailable service call', () => {
            const exception = new AwsServiceUnavailableException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.serviceUnavailable,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.serviceUnavailable
                    ],
                httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                messagePath: 'aws.error.serviceUnavailable',
            });
        });
    });
});

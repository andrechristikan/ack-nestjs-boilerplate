import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';

describe('AwsSesNotConfiguredException', () => {
    describe('constructor', () => {
        it('declares the aws module contract for an SES integration that is not configured', () => {
            const exception = new AwsSesNotConfiguredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'aws',
                statusCode: 51407,
                statusCodeKey: 'sesNotConfigured',
                httpStatus: HttpStatus.NOT_IMPLEMENTED,
                messagePath: 'aws.error.sesNotConfigured',
            });
        });
    });
});

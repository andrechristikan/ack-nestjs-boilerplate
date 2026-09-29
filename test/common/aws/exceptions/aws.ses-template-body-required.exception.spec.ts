import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsSesTemplateBodyRequiredException } from '@common/aws/exceptions/aws.ses-template-body-required.exception';

describe('AwsSesTemplateBodyRequiredException', () => {
    describe('constructor', () => {
        it('declares the aws module contract for an SES template missing both bodies', () => {
            const exception = new AwsSesTemplateBodyRequiredException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.sesTemplateBodyRequired,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.sesTemplateBodyRequired
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'aws.error.sesTemplateBodyRequired',
            });
        });
    });
});

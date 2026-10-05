import { RequestSesIdentityArnSchema } from '@common/request/validations/request.ses-identity-arn.validation';

describe('RequestSesIdentityArnSchema', () => {
    it('parses an SES identity ARN for a domain', () => {
        const arn = 'arn:aws:ses:us-east-1:123456789012:identity/example.com';

        expect(RequestSesIdentityArnSchema.parse(arn)).toBe(arn);
    });

    it('parses an SES identity ARN for an email address in a non-default partition', () => {
        const arn =
            'arn:aws-us-gov:ses:us-gov-west-1:123456789012:identity/noreply@example.com';

        expect(RequestSesIdentityArnSchema.parse(arn)).toBe(arn);
    });

    it.each([
        'arn:aws:iam::123456789012:user/ses',
        'arn:aws:ses:us-east-1:123456789012:configuration-set/default',
        'arn:aws:ses:us-east-1:1:identity/example.com',
        'arn:aws:ses:us-east-1:123456789012:identity/',
        'example.com',
    ])('rejects %s', arn => {
        expect(RequestSesIdentityArnSchema.safeParse(arn).success).toBe(false);
    });
});

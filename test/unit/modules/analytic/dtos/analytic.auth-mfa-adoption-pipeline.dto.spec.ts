import { AnalyticAuthMfaAdoptionPipelineSchema } from '@modules/analytic/dtos/analytic.auth-mfa-adoption-pipeline.dto';

describe('AnalyticAuthMfaAdoptionPipelineSchema', () => {
    const payload = [{ enabled: 1, total: 2, undeclared: 'extra' }];
    const expected = [{ enabled: 1, total: 2 }];
    const invalid = [{ enabled: 'text', total: 2 }];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticAuthMfaAdoptionPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.enabled of the wrong type', () => {
        const result = AnalyticAuthMfaAdoptionPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'enabled'],
                code: 'invalid_type',
            }),
        ]);
    });
});

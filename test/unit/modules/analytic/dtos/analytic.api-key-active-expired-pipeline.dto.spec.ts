import { AnalyticApiKeyActiveExpiredPipelineSchema } from '@modules/analytic/dtos/analytic.api-key-active-expired-pipeline.dto';

describe('AnalyticApiKeyActiveExpiredPipelineSchema', () => {
    const payload = [
        { active: 1, expired: 2, inactive: 3, undeclared: 'extra' },
    ];
    const expected = [{ active: 1, expired: 2, inactive: 3 }];
    const invalid = [{ active: 'text', expired: 2, inactive: 3 }];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticApiKeyActiveExpiredPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.active of the wrong type', () => {
        const result =
            AnalyticApiKeyActiveExpiredPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'active'],
                code: 'invalid_type',
            }),
        ]);
    });
});

import { AnalyticForgotPasswordAbusePipelineSchema } from '@modules/analytic/dtos/analytic.forgot-password-abuse-pipeline.dto';

describe('AnalyticForgotPasswordAbusePipelineSchema', () => {
    const payload = [
        {
            data: [{ userId: { $oid: '$oid-1' }, tokenCount: 1 }],
            total: [{ n: 2 }],
            undeclared: 'extra',
        },
    ];
    const expected = [
        { data: [{ userId: '$oid-1', tokenCount: 1 }], total: [{ n: 2 }] },
    ];
    const invalid = [
        { data: [{ userId: { $oid: 123 }, tokenCount: 1 }], total: [{ n: 2 }] },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticForgotPasswordAbusePipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.data.0.userId.$oid of the wrong type', () => {
        const result =
            AnalyticForgotPasswordAbusePipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'data', 0, 'userId', '$oid'],
                code: 'invalid_type',
            }),
        ]);
    });
});

import { AnalyticPipelineObjectIdSchema } from '@modules/analytic/dtos/analytic.pipeline-object-id.dto';

describe('AnalyticPipelineObjectIdSchema', () => {
    const payload = { $oid: '$oid-1', undeclared: 'extra' };
    const expected = '$oid-1';
    const invalid = { $oid: 123 };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticPipelineObjectIdSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with $oid of the wrong type', () => {
        const result = AnalyticPipelineObjectIdSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['$oid'],
                code: 'invalid_type',
            }),
        ]);
    });
});

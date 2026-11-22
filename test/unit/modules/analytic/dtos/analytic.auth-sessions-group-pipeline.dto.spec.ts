import { AnalyticAuthSessionsGroupPipelineSchema } from '@modules/analytic/dtos/analytic.auth-sessions-group-pipeline.dto';

describe('AnalyticAuthSessionsGroupPipelineSchema', () => {
    const payload = [{ _id: '_id-1', count: 1, undeclared: 'extra' }];
    const expected = [{ _id: '_id-1', count: 1 }];
    const invalid = [{ _id: 123, count: 1 }];

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticAuthSessionsGroupPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0._id of the wrong type', () => {
        const result =
            AnalyticAuthSessionsGroupPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, '_id'],
                code: 'invalid_type',
            }),
        ]);
    });
});

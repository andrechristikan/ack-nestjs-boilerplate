import { AnalyticMfaAdoptionSnapshotMetaSchema } from '@modules/analytic/dtos/analytic.mfa-adoption-snapshot-meta.dto';

describe('AnalyticMfaAdoptionSnapshotMetaSchema', () => {
    const payload = { enabled: 1, total: 2, undeclared: 'extra' };
    const expected = { enabled: 1, total: 2 };
    const invalid = { enabled: 'text', total: 2 };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticMfaAdoptionSnapshotMetaSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with enabled of the wrong type', () => {
        const result = AnalyticMfaAdoptionSnapshotMetaSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['enabled'],
                code: 'invalid_type',
            }),
        ]);
    });
});

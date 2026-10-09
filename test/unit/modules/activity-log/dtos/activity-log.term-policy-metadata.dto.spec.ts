import { ActivityLogTermPolicyMetadataSchema } from '@modules/activity-log/dtos/activity-log.term-policy-metadata.dto';

describe('ActivityLogTermPolicyMetadataSchema', () => {
    const timestamp: Date = new Date('2026-01-01T00:00:00.000Z');
    const payload = {
        termPolicyId: 'term-policy-1',
        termPolicyType: 'termsOfService',
        termPolicyVersion: 1,
        timestamp,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogTermPolicyMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('accepts a string termPolicyVersion', () => {
        const result = ActivityLogTermPolicyMetadataSchema.parse({
            termPolicyVersion: 'v1',
        });

        expect(result).toEqual({ termPolicyVersion: 'v1' });
    });

    it('parses with every field omitted', () => {
        const result = ActivityLogTermPolicyMetadataSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogTermPolicyMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });
});

import { ActivityLogPolicyMetadataSchema } from '@modules/activity-log/dtos/activity-log.policy-metadata.dto';

describe('ActivityLogPolicyMetadataSchema', () => {
    const payload = {
        roleId: 'role-1',
        subject: 'user',
        action: 'read,update',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogPolicyMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a payload missing a declared field', () => {
        expect(() =>
            ActivityLogPolicyMetadataSchema.parse({ roleId: 'role-1' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogPolicyMetadataSchema.parse({ ...payload, extra: true })
        ).toThrow();
    });
});

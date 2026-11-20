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
        const result = ActivityLogPolicyMetadataSchema.safeParse({
            roleId: 'role-1',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['subject'],
                code: 'invalid_type',
            }),
            expect.objectContaining({ path: ['action'], code: 'invalid_type' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = ActivityLogPolicyMetadataSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});

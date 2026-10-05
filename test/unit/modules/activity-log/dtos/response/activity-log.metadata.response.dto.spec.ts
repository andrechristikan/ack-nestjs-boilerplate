import { ActivityLogMetadataResponseSchema } from '@modules/activity-log/dtos/response/activity-log.metadata.response.dto';

describe('ActivityLogMetadataResponseSchema', () => {
    const row = {
        targetUserId: 'user-1',
        targetUsername: 'jane',
        actorUserId: 'user-2',
        timestamp: '2026-01-01T00:00:00.000Z',
        sessionId: 'session-1',
        sessionCount: 2,
        deviceOwnershipId: 'device-ownership-1',
        deviceId: 'device-1',
        workspaceInviteId: 'invite-1',
        userCount: 10,
        apiKeyId: 'api-key-1',
        apiKeyName: 'main key',
        apiKeyType: 'default',
        roleId: 'role-1',
        roleName: 'admin',
        roleType: 'admin',
        termPolicyId: 'term-policy-1',
        termPolicyType: 'termsOfService',
        termPolicyVersion: 1,
        channel: 'email',
        type: 'userActivity',
        isActive: true,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = ActivityLogMetadataResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses an empty row', () => {
        const result = ActivityLogMetadataResponseSchema.parse({});

        expect(result).toEqual({});
    });

    it('strips an undeclared key', () => {
        const result = ActivityLogMetadataResponseSchema.parse({
            ...row,
            secret: 'top-secret',
        });

        expect(result).toEqual(row);
    });
});

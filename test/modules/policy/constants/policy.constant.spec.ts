import { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';

describe('EnumPolicyConditionPlaceholder', () => {
    it('defines the canonical persisted condition tokens', () => {
        expect(Object.values(EnumPolicyConditionPlaceholder)).toEqual([
            '${userId}',
            '${workspaceId}',
            '${workspaceMemberId}',
            '${projectId}',
            '${projectMemberId}',
        ]);
    });
});

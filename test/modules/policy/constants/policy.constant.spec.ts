import {
    EnumPolicyConditionPlaceholder,
    PolicyAbilityStoreKey,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';

describe('EnumPolicyConditionPlaceholder', () => {
    it('defines the canonical persisted condition tokens', () => {
        expect(Object.values(EnumPolicyConditionPlaceholder)).toEqual([
            '${userId}',
            '${workspaceId}',
            '${projectId}',
        ]);
    });
});

describe('policy ability keys', () => {
    it('keeps the required metadata key and the ability store key distinct', () => {
        const keys = [PolicyRequiredMetaKey, PolicyAbilityStoreKey];

        expect(new Set(keys).size).toBe(keys.length);
    });
});

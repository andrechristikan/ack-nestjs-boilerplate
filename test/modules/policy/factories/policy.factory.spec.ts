import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { subject } from '@casl/ability';
import type { Policy } from '@generated/prisma-client/client';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';

describe('PolicyAbilityFactory', () => {
    const factory = new PolicyAbilityFactory();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const buildPolicy = (conditions: Policy['conditions']): Policy => ({
        id: 'policy-id',
        roleId: 'role-id',
        subject: EnumPolicySubject.WorkspaceMember,
        action: [EnumPolicyAction.read],
        conditions,
        inverted: false,
        reason: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    });

    it('resolves any caller-supplied placeholder without a placeholder catalog', () => {
        const ability = factory.buildFromPolicies(
            [
                buildPolicy({
                    workspaceId: EnumPolicyConditionPlaceholder.workspaceId,
                }),
            ],
            { [EnumPolicyConditionPlaceholder.workspaceId]: 'workspace-1' }
        );

        expect(
            ability.can(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.WorkspaceMember, {
                    workspaceId: 'workspace-1',
                })
            )
        ).toBe(true);
    });

    it('drops a rule when a placeholder has no resolved value', () => {
        const ability = factory.buildFromPolicies(
            [
                buildPolicy({
                    workspaceId: EnumPolicyConditionPlaceholder.workspaceId,
                }),
            ],
            {}
        );

        expect(
            ability.can(
                EnumPolicyAction.read,
                EnumPolicySubject.WorkspaceMember
            )
        ).toBe(false);
    });

    it('drops nested condition objects instead of supporting arbitrary query syntax', () => {
        const ability = factory.buildFromPolicies(
            [buildPolicy({ workspace: { id: 'workspace-1' } })],
            {}
        );

        expect(
            ability.can(
                EnumPolicyAction.read,
                EnumPolicySubject.WorkspaceMember
            )
        ).toBe(false);
    });
});

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
        const { rules } = factory.build(
            [
                buildPolicy({
                    workspaceId: EnumPolicyConditionPlaceholder.workspaceId,
                }),
            ],
            { [EnumPolicyConditionPlaceholder.workspaceId]: 'workspace-1' }
        );

        expect(rules).toEqual([
            {
                subject: EnumPolicySubject.WorkspaceMember,
                action: [EnumPolicyAction.read],
                conditions: { workspaceId: 'workspace-1' },
                inverted: false,
            },
        ]);
    });

    it('keeps a literal condition value and carries the reason', () => {
        const { rules } = factory.build(
            [{ ...buildPolicy({ roleId: 'role-1' }), reason: 'why' }],
            {}
        );

        expect(rules).toEqual([
            expect.objectContaining({
                conditions: { roleId: 'role-1' },
                reason: 'why',
            }),
        ]);
    });

    it('keeps a rule without conditions as an unconditional rule', () => {
        const { rules } = factory.build([buildPolicy(null)], {});

        expect(rules).toEqual([
            {
                subject: EnumPolicySubject.WorkspaceMember,
                action: [EnumPolicyAction.read],
                inverted: false,
            },
        ]);
    });

    it('drops a rule when a placeholder has no resolved value', () => {
        expect(
            factory.build(
                [
                    buildPolicy({
                        workspaceId: EnumPolicyConditionPlaceholder.workspaceId,
                    }),
                ],
                {}
            ).rules
        ).toEqual([]);
    });

    it('drops nested condition objects instead of supporting arbitrary query syntax', () => {
        expect(
            factory.build(
                [buildPolicy({ workspace: { id: 'workspace-1' } })],
                {}
            ).rules
        ).toEqual([]);
    });

    it('drops a rule whose conditions are not a plain object', () => {
        expect(factory.build([buildPolicy(['workspace-1'])], {}).rules).toEqual(
            []
        );
    });

    it('keeps the surviving rules when another rule is dropped', () => {
        const { rules } = factory.build(
            [
                buildPolicy({ workspace: { id: 'workspace-1' } }),
                buildPolicy(null),
            ],
            {}
        );

        expect(rules).toHaveLength(1);
    });

    it('builds the ability from every resolved rule', () => {
        const ability = factory.build(
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
        expect(
            ability.can(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.WorkspaceMember, {
                    workspaceId: 'workspace-2',
                })
            )
        ).toBe(false);
    });

    it('orders inverted rules after allows so a matching deny wins', () => {
        const ability = factory.build(
            [{ ...buildPolicy(null), inverted: true }, buildPolicy(null)],
            {}
        );

        expect(ability.rules.map(rule => rule.inverted ?? false)).toEqual([
            false,
            true,
        ]);
        expect(
            ability.can(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.WorkspaceMember, {
                    workspaceId: 'workspace-1',
                })
            )
        ).toBe(false);
    });

    it('resolves a project placeholder only when a project value exists', () => {
        const policy = buildPolicy({
            projectId: EnumPolicyConditionPlaceholder.projectId,
        });

        expect(
            factory.build([policy], {
                [EnumPolicyConditionPlaceholder.projectId]: 'project-1',
            }).rules
        ).toHaveLength(1);
        expect(
            factory.build([policy], {
                [EnumPolicyConditionPlaceholder.projectId]: undefined,
            }).rules
        ).toHaveLength(0);
    });

    it('keeps an unresolvable inverted rule as an unconditional deny', () => {
        const ability = factory.build(
            [
                buildPolicy(null),
                {
                    ...buildPolicy({
                        projectId: EnumPolicyConditionPlaceholder.projectId,
                    }),
                    inverted: true,
                    reason: 'no access',
                },
            ],
            {}
        );

        expect(ability.rules).toEqual([
            expect.objectContaining({ inverted: false }),
            {
                subject: EnumPolicySubject.WorkspaceMember,
                action: [EnumPolicyAction.read],
                inverted: true,
                reason: 'no access',
            },
        ]);
        expect(
            ability.can(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.WorkspaceMember, {
                    workspaceId: 'workspace-1',
                })
            )
        ).toBe(false);
    });

    it('keeps an inverted rule with nested conditions as an unconditional deny', () => {
        const ability = factory.build(
            [{ ...buildPolicy({ workspace: { id: 'x' } }), inverted: true }],
            {}
        );

        expect(ability.rules).toEqual([
            {
                subject: EnumPolicySubject.WorkspaceMember,
                action: [EnumPolicyAction.read],
                inverted: true,
            },
        ]);
    });
});

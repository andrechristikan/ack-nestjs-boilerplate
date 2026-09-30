import { subject } from '@casl/ability';
import type { RawRuleOf } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Policy, Workspace } from '@generated/prisma-client/client';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type {
    PolicyAbility,
    PolicyPlaceholderValues,
} from '@modules/policy/interfaces/policy.interface';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';

describe('PolicyAbilityFactory', () => {
    const factory = new PolicyAbilityFactory();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const buildWorkspace = (id: string, isPublic = false): Workspace => ({
        id,
        name: 'Workspace',
        slug: `slug-${id}`,
        description: null,
        isPublic,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    });
    const buildRule = (
        overrides: Partial<RawRuleOf<PolicyAbility>> = {}
    ): RawRuleOf<PolicyAbility> => ({
        subject: 'User',
        action: [EnumPolicyAction.read],
        conditions: undefined,
        inverted: false,
        ...overrides,
    });
    const buildPolicy = (overrides: Partial<Policy> = {}): Policy => ({
        id: 'policy-id',
        roleId: 'role-id',
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
        conditions: null,
        inverted: false,
        reason: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        ...overrides,
    });
    const placeholders: PolicyPlaceholderValues = {
        [EnumPolicyConditionPlaceholder.userId]: 'user-id',
        [EnumPolicyConditionPlaceholder.workspaceId]: 'workspace-id',
    };

    describe('build', () => {
        it('accepts CASL raw rules without remapping application subjects', () => {
            const ability = factory.build([
                buildRule({ action: EnumPolicyAction.read }),
            ]);

            expect(ability.can(EnumPolicyAction.read, 'User')).toBe(true);
        });

        it('allows a granted action on the subject and denies the rest', () => {
            const ability = factory.build([buildRule()]);

            expect(ability.can(EnumPolicyAction.read, 'User')).toBe(true);
            expect(ability.can(EnumPolicyAction.delete, 'User')).toBe(false);
            expect(ability.can(EnumPolicyAction.read, 'Role')).toBe(false);
        });

        it('lets manage cover every action', () => {
            const ability = factory.build([
                buildRule({ action: [EnumPolicyAction.manage] }),
            ]);

            expect(ability.can(EnumPolicyAction.delete, 'User')).toBe(true);
            expect(ability.can(EnumPolicyAction.create, 'User')).toBe(true);
        });

        it('lets the all subject cover every subject', () => {
            const ability = factory.build([
                buildRule({
                    subject: 'all',
                    action: [EnumPolicyAction.manage],
                }),
            ]);

            expect(ability.can(EnumPolicyAction.delete, 'Workspace')).toBe(
                true
            );
            expect(ability.can(EnumPolicyAction.read, 'Role')).toBe(true);
        });

        it('denies every check when no rule is given', () => {
            const ability = factory.build([]);

            expect(ability.can(EnumPolicyAction.read, 'User')).toBe(false);
        });

        it('lets an inverted rule deny an allow regardless of input order', () => {
            const ability = factory.build([
                buildRule(),
                buildRule({ inverted: true }),
            ]);

            expect(ability.can(EnumPolicyAction.read, 'User')).toBe(false);
        });

        it('keeps an inverted rule authoritative regardless of input order', () => {
            const ability = factory.build([
                buildRule({ inverted: true }),
                buildRule(),
            ]);

            expect(ability.can(EnumPolicyAction.read, 'User')).toBe(false);
        });

        it('matches an object against the rule conditions', () => {
            const ability = factory.build([
                buildRule({
                    subject: 'Workspace',
                    conditions: { id: 'w1' },
                }),
            ]);

            expect(
                ability.can(
                    EnumPolicyAction.read,
                    subject('Workspace', buildWorkspace('w1'))
                )
            ).toBe(true);
            expect(
                ability.can(
                    EnumPolicyAction.read,
                    subject('Workspace', buildWorkspace('w2'))
                )
            ).toBe(false);
        });

        it('ignores the conditions of an inverted rule on a subject-only check', () => {
            const ability = factory.build([
                buildRule({ subject: 'Workspace' }),
                buildRule({
                    subject: 'Workspace',
                    inverted: true,
                    conditions: { isPublic: true },
                }),
            ]);

            expect(ability.can(EnumPolicyAction.read, 'Workspace')).toBe(true);
        });

        it('denies an object only when it matches an inverted conditional rule', () => {
            const ability = factory.build([
                buildRule({ subject: 'Workspace' }),
                buildRule({
                    subject: 'Workspace',
                    inverted: true,
                    conditions: { isPublic: true },
                }),
            ]);

            expect(
                ability.can(
                    EnumPolicyAction.read,
                    subject('Workspace', buildWorkspace('w1', true))
                )
            ).toBe(false);
            expect(
                ability.can(
                    EnumPolicyAction.read,
                    subject('Workspace', buildWorkspace('w1', false))
                )
            ).toBe(true);
        });

        it('keeps the rules it was given untouched', () => {
            const rules = [buildRule({ conditions: { id: 'x' } })];
            const snapshot = structuredClone(rules);

            const ability = factory.build(rules);

            expect(rules).toEqual(snapshot);
            expect(ability.rules).toHaveLength(1);
            expect(ability.rules).not.toBe(rules);
        });

        it('carries the reason of an inverted rule', () => {
            const ability = factory.build([
                buildRule({ inverted: true, reason: 'blocked' }),
            ]);

            expect(
                ability.relevantRuleFor(EnumPolicyAction.read, 'User')?.reason
            ).toBe('blocked');
        });

        it('carries no reason for an inverted rule without one', () => {
            const ability = factory.build([buildRule({ inverted: true })]);

            expect(
                ability.relevantRuleFor(EnumPolicyAction.read, 'User')?.reason
            ).toBeUndefined();
        });

        it('lets manage on a specific subject grant an action the registry never listed for it', () => {
            const ability = factory.build([
                buildRule({
                    subject: 'WorkspaceMember',
                    action: [EnumPolicyAction.manage],
                }),
            ]);

            expect(
                ability.can(EnumPolicyAction.create, 'WorkspaceMember')
            ).toBe(true);
        });

        it('leaves a manage rule on the all subject as the true wildcard', () => {
            const ability = factory.build([
                buildRule({
                    subject: 'all',
                    action: [EnumPolicyAction.manage],
                }),
            ]);

            expect(ability.can(EnumPolicyAction.create, 'Workspace')).toBe(
                true
            );
            expect(ability.can(EnumPolicyAction.delete, 'Role')).toBe(true);
        });

        it('carries conditions, inversion and reason onto an expanded manage rule', () => {
            const ability = factory.build([
                buildRule({
                    subject: 'WorkspaceMember',
                    action: [EnumPolicyAction.manage],
                    inverted: true,
                    reason: 'blocked',
                }),
            ]);

            const rule = ability.relevantRuleFor(
                EnumPolicyAction.update,
                'WorkspaceMember'
            );
            expect(rule?.inverted).toBe(true);
            expect(rule?.reason).toBe('blocked');
        });

        it('expands a rule with several actions into one check per action', () => {
            const ability = factory.build([
                buildRule({
                    action: [EnumPolicyAction.read, EnumPolicyAction.update],
                }),
            ]);

            expect(ability.can(EnumPolicyAction.read, 'User')).toBe(true);
            expect(ability.can(EnumPolicyAction.update, 'User')).toBe(true);
            expect(ability.can(EnumPolicyAction.create, 'User')).toBe(false);
        });
    });

    describe('buildFromPolicies', () => {
        it('interpolates policy conditions without mutating persisted policies', () => {
            const policy = buildPolicy({
                conditions: {
                    userId: EnumPolicyConditionPlaceholder.userId,
                },
            });
            const snapshot = structuredClone(policy);

            const ability = factory.buildFromPolicies([policy], placeholders);

            expect(policy).toEqual(snapshot);
            expect(
                ability.can(
                    EnumPolicyAction.read,
                    subject('User', { userId: 'user-id' })
                )
            ).toBe(true);
        });

        it('builds only the supplied policies', () => {
            const ability = factory.buildFromPolicies(
                [buildPolicy({ subject: EnumPolicySubject.Project })],
                placeholders
            );

            expect(ability.can(EnumPolicyAction.read, 'Project')).toBe(true);
            expect(ability.can(EnumPolicyAction.read, 'Workspace')).toBe(false);
        });

        it('drops policies whose conditions cannot be resolved', () => {
            const ability = factory.buildFromPolicies(
                [
                    buildPolicy({
                        conditions: {
                            projectId: EnumPolicyConditionPlaceholder.projectId,
                        },
                    }),
                ],
                placeholders
            );

            expect(ability.can(EnumPolicyAction.read, 'User')).toBe(false);
        });
    });

    describe('isPlainJsonObject', () => {
        it('accepts a plain object', () => {
            expect(factory['isPlainJsonObject']({ a: 1 })).toBe(true);
        });

        it.each([
            ['null', null],
            ['an array', [1]],
            ['a string', 'x'],
            ['a number', 3],
        ])('rejects %s', (_name, value) => {
            expect(factory['isPlainJsonObject'](value)).toBe(false);
        });
    });

    describe('interpolateNode', () => {
        it('returns primitive values unchanged', () => {
            expect(factory['interpolateNode']('literal', {})).toBe('literal');
            expect(factory['interpolateNode'](null, {})).toBeNull();
            expect(factory['interpolateNode'](3, {})).toBe(3);
        });

        it('resolves placeholders in nested objects and arrays', () => {
            expect(
                factory['interpolateNode'](
                    {
                        AND: [
                            {
                                userId: EnumPolicyConditionPlaceholder.userId,
                            },
                            {
                                ids: [
                                    EnumPolicyConditionPlaceholder.projectId,
                                    'literal',
                                ],
                            },
                        ],
                    },
                    {
                        [EnumPolicyConditionPlaceholder.userId]: 'user-1',
                        [EnumPolicyConditionPlaceholder.projectId]: 'project-1',
                    }
                )
            ).toEqual({
                AND: [{ userId: 'user-1' }, { ids: ['project-1', 'literal'] }],
            });
        });

        it('returns undefined when a placeholder is unavailable', () => {
            expect(
                factory['interpolateNode'](
                    EnumPolicyConditionPlaceholder.projectId,
                    {}
                )
            ).toBeUndefined();
        });

        it('leaves unknown placeholder-like strings unchanged', () => {
            expect(
                factory['interpolateNode']('${unknown}', {
                    [EnumPolicyConditionPlaceholder.userId]: 'user-1',
                })
            ).toBe('${unknown}');
        });
    });

    describe('interpolate', () => {
        it('returns interpolated conditions without mutating the input', () => {
            const conditions = {
                userId: EnumPolicyConditionPlaceholder.userId,
                workspaceId: EnumPolicyConditionPlaceholder.workspaceId,
            };

            expect(factory['interpolate'](conditions, placeholders)).toEqual({
                userId: 'user-id',
                workspaceId: 'workspace-id',
            });
            expect(conditions).toEqual({
                userId: EnumPolicyConditionPlaceholder.userId,
                workspaceId: EnumPolicyConditionPlaceholder.workspaceId,
            });
        });

        it('returns null when interpolation does not produce an object', () => {
            expect(
                factory['interpolate'](
                    { projectId: EnumPolicyConditionPlaceholder.projectId },
                    placeholders
                )
            ).toBeNull();
        });
    });
});

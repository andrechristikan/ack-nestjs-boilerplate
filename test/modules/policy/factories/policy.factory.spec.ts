import { subject } from '@casl/ability';
import { EnumPolicyAction } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type { IPolicyAbilityRule } from '@modules/policy/interfaces/policy.interface';

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
        overrides: Partial<IPolicyAbilityRule> = {}
    ): IPolicyAbilityRule => ({
        subject: 'User',
        action: [EnumPolicyAction.read],
        conditions: null,
        inverted: false,
        reason: null,
        ...overrides,
    });

    describe('build', () => {
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
                buildRule({ subject: 'Workspace', conditions: { id: 'w1' } }),
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
});

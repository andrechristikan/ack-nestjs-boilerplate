import { buildPolicyRule } from '@test/unit/helpers/test.unit.policy.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.ability.factory';
import type { IPolicyPlaceholderValues } from '@modules/policy/interfaces/policy.interface';

describe('PolicyAbilityFactory', () => {
    let factory: PolicyAbilityFactory;

    const placeholders: IPolicyPlaceholderValues = {
        [EnumPolicyConditionPlaceholder.userId]: 'user-1',
        [EnumPolicyConditionPlaceholder.workspaceId]: 'workspace-1',
        [EnumPolicyConditionPlaceholder.projectId]: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [PolicyAbilityFactory],
        }).compile();

        factory = module.get(PolicyAbilityFactory);
    });

    describe('build', () => {
        it('grants an action a rule names on its subject', () => {
            const ability = factory.build([buildPolicyRule({})], placeholders);

            expect(
                ability.can(EnumPolicyAction.read, EnumPolicySubject.User)
            ).toBe(true);
            expect(
                ability.can(EnumPolicyAction.update, EnumPolicySubject.User)
            ).toBe(false);
        });

        it('grants every action on every subject for a manage rule on all', () => {
            const ability = factory.build(
                [
                    buildPolicyRule({
                        subject: EnumPolicySubject.all,
                        action: [EnumPolicyAction.manage],
                    }),
                ],
                placeholders
            );

            expect(
                ability.can(EnumPolicyAction.delete, EnumPolicySubject.Role)
            ).toBe(true);
        });

        it('grants nothing when no rule exists', () => {
            const ability = factory.build([], placeholders);

            expect(
                ability.can(EnumPolicyAction.read, EnumPolicySubject.User)
            ).toBe(false);
        });

        it('resolves a placeholder at any depth of the conditions', () => {
            const ability = factory.build(
                [
                    buildPolicyRule({
                        subject: EnumPolicySubject.Project,
                        conditions: {
                            workspaceId: '${workspaceId}',
                            members: { some: { userId: '${userId}' } },
                        },
                    }),
                ],
                placeholders
            );

            expect(
                ability.rulesFor(
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )[0]?.conditions
            ).toEqual({
                workspaceId: 'workspace-1',
                members: { some: { userId: 'user-1' } },
            });
        });

        it('drops an allow rule whose placeholder has no value, so it grants nothing', () => {
            const ability = factory.build(
                [
                    buildPolicyRule({
                        subject: EnumPolicySubject.Project,
                        conditions: { id: '${projectId}' },
                    }),
                ],
                placeholders
            );

            expect(
                ability.can(EnumPolicyAction.read, EnumPolicySubject.Project)
            ).toBe(false);
        });

        it('turns an inverted rule whose placeholder has no value into an unconditional deny', () => {
            const ability = factory.build(
                [
                    buildPolicyRule({
                        subject: EnumPolicySubject.all,
                        action: [EnumPolicyAction.manage],
                    }),
                    buildPolicyRule({
                        subject: EnumPolicySubject.Project,
                        inverted: true,
                        reason: 'locked',
                        conditions: { id: '${projectId}' },
                    }),
                ],
                placeholders
            );

            expect(
                ability.can(EnumPolicyAction.read, EnumPolicySubject.Project)
            ).toBe(false);
            expect(
                ability.relevantRuleFor(
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )?.reason
            ).toBe('locked');
        });

        it('drops an allow rule whose placeholder is not a known one, so it grants nothing', () => {
            const ability = factory.build(
                [
                    buildPolicyRule({
                        conditions: { id: '${userID}' },
                    }),
                ],
                placeholders
            );

            expect(
                ability.rulesFor(EnumPolicyAction.read, EnumPolicySubject.User)
            ).toEqual([]);
        });

        it('drops an allow rule whose conditions are not a plain object', () => {
            const ability = factory.build(
                [buildPolicyRule({ conditions: ['x'] })],
                placeholders
            );

            expect(
                ability.can(EnumPolicyAction.read, EnumPolicySubject.User)
            ).toBe(false);
        });

        it('lets a later inverted rule override an earlier allow', () => {
            const ability = factory.build(
                [
                    buildPolicyRule({ action: [EnumPolicyAction.manage] }),
                    buildPolicyRule({
                        action: [EnumPolicyAction.delete],
                        inverted: true,
                        reason: 'no deletes',
                    }),
                ],
                placeholders
            );

            expect(
                ability.can(EnumPolicyAction.delete, EnumPolicySubject.User)
            ).toBe(false);
            expect(
                ability.can(EnumPolicyAction.read, EnumPolicySubject.User)
            ).toBe(true);
        });

        it('resolves placeholders inside an array of values and keeps plain values and nulls', () => {
            const ability = factory.build(
                [
                    buildPolicyRule({
                        subject: EnumPolicySubject.Project,
                        conditions: {
                            id: { in: ['${userId}', 'fixed'] },
                            deletedAt: null,
                        },
                    }),
                ],
                placeholders
            );

            expect(
                ability.rulesFor(
                    EnumPolicyAction.read,
                    EnumPolicySubject.Project
                )[0]?.conditions
            ).toEqual({
                id: { in: ['user-1', 'fixed'] },
                deletedAt: null,
            });
        });

        it('drops an allow rule whose placeholder sits inside an array and has no value', () => {
            const ability = factory.build(
                [
                    buildPolicyRule({
                        subject: EnumPolicySubject.Project,
                        conditions: { id: { in: ['${projectId}'] } },
                    }),
                ],
                placeholders
            );

            expect(
                ability.can(EnumPolicyAction.read, EnumPolicySubject.Project)
            ).toBe(false);
        });

        it('keeps an inverted rule that carries no reason', () => {
            const ability = factory.build(
                [
                    buildPolicyRule({ action: [EnumPolicyAction.manage] }),
                    buildPolicyRule({
                        action: [EnumPolicyAction.delete],
                        inverted: true,
                    }),
                ],
                placeholders
            );

            expect(
                ability.can(EnumPolicyAction.delete, EnumPolicySubject.User)
            ).toBe(false);
        });
    });
});

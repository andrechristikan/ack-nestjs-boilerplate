import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createPrismaAbility } from '@casl/prisma/runtime';
import type { RawRuleOf } from '@casl/ability';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import {
    PolicyAbilityStoreKey,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import type {
    IPolicyRequired,
    PolicyAbility,
} from '@modules/policy/interfaces/policy.interface';

describe('PolicyGuard', () => {
    const reflector: MockProxy<Reflector> = mock();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> = mock();
    const context: MockProxy<ExecutionContext> = mock();
    const useAbility = (rules: RawRuleOf<PolicyAbility>[]): void => {
        policyAbilityDomain.requireStored.mockReturnValue(
            createPrismaAbility<PolicyAbility>(rules)
        );
    };
    const catchForbidden = (
        required: IPolicyRequired[]
    ): PolicyForbiddenException => {
        reflector.get.mockReturnValue(required);
        try {
            guard.canActivate(context);
        } catch (error) {
            return error as PolicyForbiddenException;
        }
        throw new Error('expected throw');
    };
    let guard: PolicyGuard;

    beforeEach(() => {
        vi.resetAllMocks();
        guard = new PolicyGuard(reflector, policyAbilityDomain);
        context.getHandler.mockReturnValue(() => undefined);
    });

    describe('canActivate', () => {
        it('rejects routes without policy metadata', () => {
            reflector.get.mockReturnValue(undefined);
            expect(() => guard.canActivate(context)).toThrow(
                PolicyPredefinedNotFoundException
            );
        });

        it('reads the metadata and the stored ability, then returns true when every action is granted', () => {
            useAbility([
                {
                    action: [EnumPolicyAction.read, EnumPolicyAction.update],
                    subject: 'Project',
                },
            ]);
            reflector.get.mockReturnValue([
                {
                    subject: EnumPolicySubject.Project,
                    action: [EnumPolicyAction.read, EnumPolicyAction.update],
                },
            ]);

            expect(guard.canActivate(context)).toBe(true);
            expect(reflector.get).toHaveBeenCalledWith(
                PolicyRequiredMetaKey,
                expect.any(Function)
            );
            expect(policyAbilityDomain.requireStored).toHaveBeenCalledWith(
                PolicyAbilityStoreKey
            );
        });

        it('reports every missing action of a subject in one exception', () => {
            useAbility([]);

            const error = catchForbidden([
                {
                    subject: EnumPolicySubject.Project,
                    action: [EnumPolicyAction.read, EnumPolicyAction.update],
                },
            ]);

            expect(error).toBeInstanceOf(PolicyForbiddenException);
            expect(error.metadata).toEqual({
                missing: [
                    {
                        subject: EnumPolicySubject.Project,
                        actions: [
                            EnumPolicyAction.read,
                            EnumPolicyAction.update,
                        ],
                    },
                ],
            });
        });

        it('lists only the denied actions, merges and dedupes repeated subjects', () => {
            useAbility([{ action: EnumPolicyAction.read, subject: 'Project' }]);

            const error = catchForbidden([
                {
                    subject: EnumPolicySubject.Project,
                    action: [EnumPolicyAction.read, EnumPolicyAction.update],
                },
                {
                    subject: EnumPolicySubject.User,
                    action: [EnumPolicyAction.read],
                },
                {
                    subject: EnumPolicySubject.Project,
                    action: [EnumPolicyAction.update, EnumPolicyAction.delete],
                },
            ]);

            expect(error.metadata).toEqual({
                missing: [
                    {
                        subject: EnumPolicySubject.Project,
                        actions: [
                            EnumPolicyAction.update,
                            EnumPolicyAction.delete,
                        ],
                    },
                    {
                        subject: EnumPolicySubject.User,
                        actions: [EnumPolicyAction.read],
                    },
                ],
            });
        });

        it('carries the reason of the first denying inverted rule', () => {
            useAbility([
                { action: EnumPolicyAction.read, subject: 'Project' },
                {
                    action: EnumPolicyAction.read,
                    subject: 'Project',
                    inverted: true,
                    reason: 'blocked by rule',
                },
            ]);

            const error = catchForbidden([
                {
                    subject: EnumPolicySubject.Project,
                    action: [EnumPolicyAction.read],
                },
            ]);

            expect(error.metadata).toEqual({
                reason: 'blocked by rule',
                missing: [
                    {
                        subject: EnumPolicySubject.Project,
                        actions: [EnumPolicyAction.read],
                    },
                ],
            });
        });
    });
});

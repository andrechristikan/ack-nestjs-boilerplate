import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';

describe('PolicyGuard', () => {
    const reflector: MockProxy<Reflector> = mock();
    const policyDomain: MockProxy<PolicyDomain> = mock();
    const context: MockProxy<ExecutionContext> = mock();
    const ability: MockProxy<PolicyAbility> = mock();
    let guard: PolicyGuard;

    beforeEach(() => {
        vi.resetAllMocks();
        guard = new PolicyGuard(reflector, policyDomain);
        context.getHandler.mockReturnValue(() => undefined);
        policyDomain.requireStored.mockReturnValue(ability);
    });

    it('rejects routes without policy metadata', () => {
        reflector.get.mockReturnValue(undefined);
        expect(() => guard.canActivate(context)).toThrow(
            PolicyPredefinedNotFoundException
        );
    });

    it('checks every declared action against the stored ability', () => {
        reflector.get.mockReturnValue([
            {
                subject: EnumPolicySubject.Project,
                action: [EnumPolicyAction.read, EnumPolicyAction.update],
            },
        ]);

        expect(guard.canActivate(context)).toBe(true);
        expect(policyDomain.requireStored).toHaveBeenCalledWith(
            PolicyAbilityStoreKey
        );
        expect(policyDomain.assertCan).toHaveBeenCalledWith(
            ability,
            EnumPolicyAction.read,
            EnumPolicySubject.Project
        );
        expect(policyDomain.assertCan).toHaveBeenCalledWith(
            ability,
            EnumPolicyAction.update,
            EnumPolicySubject.Project
        );
        expect(reflector.get).toHaveBeenCalledWith(
            PolicyRequiredMetaKey,
            expect.any(Function)
        );
    });
});

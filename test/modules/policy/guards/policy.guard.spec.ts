import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyRequiredMetaKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';

describe('PolicyGuard', () => {
    const reflector: MockProxy<Reflector> = mock();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> = mock();
    const context: MockProxy<ExecutionContext> = mock();
    let guard: PolicyGuard;

    beforeEach(() => {
        vi.resetAllMocks();
        guard = new PolicyGuard(reflector, policyAbilityDomain);
        context.getHandler.mockReturnValue(() => undefined);
    });

    it('rejects routes without policy metadata', () => {
        reflector.get.mockReturnValue(undefined);
        expect(() => guard.canActivate(context)).toThrow(
            PolicyPredefinedNotFoundException
        );
    });

    it('checks every declared action in one call to the policy ability domain', () => {
        const required = [
            {
                subject: EnumPolicySubject.Project,
                action: [EnumPolicyAction.read, EnumPolicyAction.update],
            },
        ];
        reflector.get.mockReturnValue(required);

        expect(guard.canActivate(context)).toBe(true);
        expect(policyAbilityDomain.assertCanEvery).toHaveBeenCalledWith(
            required
        );
        expect(reflector.get).toHaveBeenCalledWith(
            PolicyRequiredMetaKey,
            expect.any(Function)
        );
    });
});

import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import {
    PolicyContextStoreKey,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyGuardMissingException } from '@modules/policy/exceptions/policy.guard-missing.exception';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';

describe('PolicyGuard', () => {
    let guard: PolicyGuard;
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();

    const readUser = {
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
    };
    const policyContext = { ability: {} } as IPolicyContext;

    beforeEach(async () => {
        vi.resetAllMocks();
        executionContext.getHandler.mockReturnValue(vi.fn());

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyGuard,
                { provide: Reflector, useValue: reflector },
                { provide: RequestStoreService, useValue: requestStoreService },
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
            ],
        }).compile();

        guard = module.get(PolicyGuard);
    });

    describe('canActivate', () => {
        it('validates the handler requirements against the stored policy context and returns true', () => {
            reflector.get.mockReturnValue([readUser]);
            requestStoreService.get.mockReturnValue(policyContext);

            const result = guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(reflector.get).toHaveBeenCalledWith(
                PolicyRequiredMetaKey,
                executionContext.getHandler()
            );
            expect(requestStoreService.get).toHaveBeenCalledWith(
                PolicyContextStoreKey
            );
            expect(
                policyAbilityService.validatePolicyGuard
            ).toHaveBeenCalledWith(policyContext, [readUser]);
        });

        it('validates an empty list when the handler has no requirement metadata', () => {
            reflector.get.mockReturnValue(undefined);
            requestStoreService.get.mockReturnValue(policyContext);

            guard.canActivate(executionContext);

            expect(
                policyAbilityService.validatePolicyGuard
            ).toHaveBeenCalledWith(policyContext, []);
        });

        it('lets the service refusal propagate', () => {
            reflector.get.mockReturnValue([readUser]);
            requestStoreService.get.mockReturnValue(policyContext);
            policyAbilityService.validatePolicyGuard.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            expect(() => guard.canActivate(executionContext)).toThrow(
                PolicyForbiddenException
            );
        });

        it('throws the guard-missing exception when no ability was stored', () => {
            reflector.get.mockReturnValue([readUser]);
            requestStoreService.get.mockReturnValue(null);

            expect(() => guard.canActivate(executionContext)).toThrow(
                PolicyGuardMissingException
            );
            expect(
                policyAbilityService.validatePolicyGuard
            ).not.toHaveBeenCalled();
        });
    });
});

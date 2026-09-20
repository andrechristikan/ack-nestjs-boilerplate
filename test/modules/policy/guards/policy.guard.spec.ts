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
    type Policy,
} from '@generated/prisma-client';
import {
    PolicyRequiredMetaKey,
    PolicyStoreKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { UserStoreKey } from '@modules/user/constants/user.constant';

describe('PolicyGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const requestStoreGet = vi.mocked(requestStoreService.get);
    const now = new Date('2026-01-01T00:00:00.000Z');
    const policies = [
        {
            id: 'policy-id',
            roleId: 'role-id',
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.read],
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        },
    ] satisfies Policy[];

    let guard: PolicyGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyGuard,
                { provide: Reflector, useValue: reflector },
                { provide: PolicyDomain, useValue: policyDomain },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        guard = moduleRef.get(PolicyGuard);
    });

    it('hands required metadata and request-scoped authorization state to the service', async () => {
        const handler = () => undefined;
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.getHandler.mockReturnValue(handler);
        const required = [
            {
                subject: EnumPolicySubject.user,
                action: [EnumPolicyAction.read],
            },
        ];
        const storedUser = { id: 'user-id' };
        reflector.get.mockReturnValue(required);
        requestStoreGet
            .mockReturnValueOnce(storedUser)
            .mockReturnValueOnce(policies);
        policyDomain.validatePolicyGuard.mockReturnValue(true);

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(reflector.get).toHaveBeenCalledWith(
            PolicyRequiredMetaKey,
            handler
        );
        expect(requestStoreGet).toHaveBeenNthCalledWith(1, UserStoreKey);
        expect(requestStoreGet).toHaveBeenNthCalledWith(2, PolicyStoreKey);
        expect(policyDomain.validatePolicyGuard).toHaveBeenCalledWith(
            storedUser,
            policies,
            required
        );
    });

    it('uses an empty required-policy list when metadata is absent', async () => {
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        reflector.get.mockReturnValue(undefined);
        requestStoreGet.mockReturnValue(null);
        policyDomain.validatePolicyGuard.mockReturnValue(true);

        await guard.canActivate(context);

        expect(policyDomain.validatePolicyGuard).toHaveBeenCalledWith(
            null,
            null,
            []
        );
    });
});

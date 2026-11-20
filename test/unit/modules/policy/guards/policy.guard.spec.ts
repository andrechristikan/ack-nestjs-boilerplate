import { UserContextStoreKey } from '@modules/user/constants/user.constant';
import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import {
    PolicyRequiredMetaKey,
    PolicyStoreKey,
} from '@modules/policy/constants/policy.constant';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';

import type { IUser } from '@modules/user/interfaces/user.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import {
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('PolicyGuard', () => {
    const user: IUser = buildUser('user-1', 'jane@example.com');

    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const policyService: MockProxy<PolicyService> = mock<PolicyService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();

    let guard: PolicyGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyGuard,
                { provide: Reflector, useValue: reflector },
                { provide: PolicyService, useValue: policyService },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        guard = module.get(PolicyGuard);
    });

    describe('canActivate', () => {
        it('reads the required policies, user, and policies from their stores and delegates to the domain', async () => {
            const requiredPolicies: PolicyRequestDto[] = [
                {
                    subject: EnumPolicySubject.user,
                    action: [EnumPolicyAction.manage],
                },
            ];
            const policies: Policy[] = [];
            reflector.get.mockReturnValue(requiredPolicies);
            requestStoreService.get.mockImplementation((key: string) => {
                if (key === UserContextStoreKey) {
                    return buildUserContext(user);
                }
                if (key === PolicyStoreKey) {
                    return policies;
                }
                return null;
            });
            policyService.validatePolicyGuard.mockReturnValue(true);

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(reflector.get).toHaveBeenCalledWith(
                PolicyRequiredMetaKey,
                executionContext.getHandler()
            );
            expect(policyService.validatePolicyGuard).toHaveBeenCalledWith(
                user,
                policies,
                requiredPolicies
            );
        });

        it('defaults required policies to an empty array when no metadata is set', async () => {
            const policies: Policy[] = [];
            reflector.get.mockReturnValue(undefined);
            requestStoreService.get.mockImplementation((key: string) => {
                if (key === UserContextStoreKey) {
                    return buildUserContext(user);
                }
                return policies;
            });
            policyService.validatePolicyGuard.mockReturnValue(true);

            await guard.canActivate(executionContext);

            expect(policyService.validatePolicyGuard).toHaveBeenCalledWith(
                user,
                policies,
                []
            );
        });

        it('throws UserGuardMissingException before the domain call when the store holds no user context', async () => {
            reflector.get.mockReturnValue([]);
            requestStoreService.get.mockReturnValue(null);

            await expect(
                guard.canActivate(executionContext)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.guardMissing,
            });
            expect(policyService.validatePolicyGuard).not.toHaveBeenCalled();
        });

        it('throws PolicyGuardMissingException before the domain call when the policy store is empty', async () => {
            reflector.get.mockReturnValue([]);
            requestStoreService.get.mockImplementation((key: string) => {
                if (key === UserContextStoreKey) {
                    return buildUserContext(user);
                }
                return null;
            });

            await expect(
                guard.canActivate(executionContext)
            ).rejects.toMatchObject({
                module: 'policy',
                statusCode: EnumPolicyStatusCodeError.guardMissing,
            });
            expect(policyService.validatePolicyGuard).not.toHaveBeenCalled();
        });

        it('propagates a false result from the domain', async () => {
            reflector.get.mockReturnValue([]);
            requestStoreService.get.mockImplementation((key: string) => {
                if (key === UserContextStoreKey) {
                    return buildUserContext(user);
                }
                return [];
            });
            policyService.validatePolicyGuard.mockReturnValue(false);

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                false
            );
        });
    });
});

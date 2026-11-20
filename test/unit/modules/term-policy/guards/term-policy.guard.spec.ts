import { UserContextStoreKey } from '@modules/user/constants/user.constant';
import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { TermPolicyRequiredGuardMetaKey } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyGuard } from '@modules/term-policy/guards/term-policy.guard';

import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('TermPolicyGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();

    const user: IUser = buildUser('user-1', 'andre@example.com');

    let guard: TermPolicyGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyGuard,
                { provide: Reflector, useValue: reflector },
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        guard = module.get(TermPolicyGuard);
    });

    describe('canActivate', () => {
        it('reads the required term policies and the user, then delegates the user id to the domain', async () => {
            const requiredTermPolicies = [EnumTermPolicyType.privacy];
            reflector.get.mockReturnValue(requiredTermPolicies);
            requestStoreService.get.mockReturnValue(buildUserContext(user));
            termPolicyAcceptanceService.validateTermPolicyGuard.mockResolvedValue(
                undefined
            );

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(reflector.get).toHaveBeenCalledWith(
                TermPolicyRequiredGuardMetaKey,
                executionContext.getHandler()
            );
            expect(requestStoreService.get).toHaveBeenCalledWith(
                UserContextStoreKey
            );
            expect(
                termPolicyAcceptanceService.validateTermPolicyGuard
            ).toHaveBeenCalledWith(user.id, requiredTermPolicies);
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
            expect(
                termPolicyAcceptanceService.validateTermPolicyGuard
            ).not.toHaveBeenCalled();
        });

        it('propagates the exception the domain throws for a missing acceptance', async () => {
            reflector.get.mockReturnValue([]);
            requestStoreService.get.mockReturnValue(buildUserContext(user));
            const rejection = new Error('required-invalid');
            termPolicyAcceptanceService.validateTermPolicyGuard.mockRejectedValue(
                rejection
            );

            await expect(guard.canActivate(executionContext)).rejects.toBe(
                rejection
            );
        });
    });
});

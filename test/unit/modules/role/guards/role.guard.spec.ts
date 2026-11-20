import { UserContextStoreKey } from '@modules/user/constants/user.constant';
import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumRoleType } from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyStoreKey } from '@modules/policy/constants/policy.constant';
import { RoleRequiredMetaKey } from '@modules/role/constants/role.constant';
import { RoleService } from '@modules/role/services/role.service';
import { RoleGuard } from '@modules/role/guards/role.guard';

import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('RoleGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();

    const user: IUser = buildUser('user-1', 'john@example.com');
    const policies: Policy[] = [];

    let guard: RoleGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleGuard,
                { provide: Reflector, useValue: reflector },
                { provide: RoleService, useValue: roleService },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        guard = module.get(RoleGuard);
    });

    describe('canActivate', () => {
        it('reads the required roles and stored user, delegates to the domain, and stores the resolved policies', async () => {
            reflector.get.mockReturnValue([EnumRoleType.user]);
            requestStoreService.get.mockReturnValue(buildUserContext(user));
            roleService.validateRoleGuard.mockResolvedValue(policies);

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(reflector.get).toHaveBeenCalledWith(
                RoleRequiredMetaKey,
                executionContext.getHandler()
            );
            expect(requestStoreService.get).toHaveBeenCalledWith(
                UserContextStoreKey
            );
            expect(roleService.validateRoleGuard).toHaveBeenCalledWith(user, [
                EnumRoleType.user,
            ]);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                PolicyStoreKey,
                policies
            );
        });

        it('defaults required roles to an empty array when no metadata is set', async () => {
            reflector.get.mockReturnValue(undefined);
            requestStoreService.get.mockReturnValue(buildUserContext(user));
            roleService.validateRoleGuard.mockResolvedValue([]);

            await guard.canActivate(executionContext);

            expect(roleService.validateRoleGuard).toHaveBeenCalledWith(
                user,
                []
            );
        });

        it('throws UserGuardMissingException before the domain call when the store holds no user context', async () => {
            reflector.get.mockReturnValue([EnumRoleType.user]);
            requestStoreService.get.mockReturnValue(null);

            await expect(
                guard.canActivate(executionContext)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.guardMissing,
            });
            expect(roleService.validateRoleGuard).not.toHaveBeenCalled();
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('propagates a thrown exception from the domain', async () => {
            reflector.get.mockReturnValue([]);
            requestStoreService.get.mockReturnValue(buildUserContext(user));
            const error = new Error('forbidden');
            roleService.validateRoleGuard.mockRejectedValue(error);

            await expect(guard.canActivate(executionContext)).rejects.toBe(
                error
            );
        });
    });
});

import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RequestStoreService } from '@common/request/services/request.store.service';
import { UserGuardIsVerifiedMetaKey } from '@modules/user/constants/user.constant';
import { UserGuard } from '@modules/user/guards/user.guard';
import type { UserDomain } from '@modules/user/domains/user.domain';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('UserGuard', () => {
    const reflector = createMock<Reflector>();
    const userService = createMock<UserDomain>();
    const requestStoreService = createMock<RequestStoreService>();
    let guard: UserGuard;

    const request = { user: { userId: 'user-id' } };
    const user = createMock<IUser>({ id: 'user-id' });

    const createContext = () =>
        createMock<ExecutionContext>({
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        });

    beforeEach(() => {
        reflector.get.mockReset();
        userService.validateUserGuard.mockReset();
        userService.validateUserGuard.mockResolvedValue(user);
        requestStoreService.set.mockReset();

        guard = new UserGuard(reflector, userService, requestStoreService);
    });

    it('validates the user, defaulting the verified requirement to false, and stores it', async () => {
        reflector.get.mockReturnValue(undefined);
        const context = createContext();

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(reflector.get).toHaveBeenCalledWith(
            UserGuardIsVerifiedMetaKey,
            context.getHandler()
        );
        expect(userService.validateUserGuard).toHaveBeenCalledWith(
            'user-id',
            false
        );
        expect(requestStoreService.set).toHaveBeenCalledWith(
            expect.any(String),
            user
        );
    });

    it('forwards the required-verified metadata when present', async () => {
        reflector.get.mockReturnValue(true);
        const context = createContext();

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(userService.validateUserGuard).toHaveBeenCalledWith(
            'user-id',
            true
        );
    });
});

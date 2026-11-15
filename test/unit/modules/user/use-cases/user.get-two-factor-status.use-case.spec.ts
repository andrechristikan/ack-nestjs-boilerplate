import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { UserService } from '@modules/user/services/user.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type { TwoFactor } from '@generated/prisma-client/client';
import { UserGetTwoFactorStatusUseCase } from '@modules/user/use-cases/user.get-two-factor-status.use-case';
import { buildUserContext } from '@test/unit/helpers/test.unit.request.helper';

describe('UserGetTwoFactorStatusUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();

    let useCase: UserGetTwoFactorStatusUseCase;

    const twoFactor: TwoFactor = {
        id: 'two-factor-marten',
        userId: 'user-marten',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: true,
        requiredSetup: false,
        confirmedAt: new Date('2026-01-05T00:00:00.000Z'),
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        lockedUntil: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const user: IUser = {
        id: 'user-marten',
        name: 'Marten Cole',
        username: 'martenCole',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'marten@example.com',
        roleId: 'role-marten',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-marten',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-marten',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserGetTwoFactorStatusUseCase,
                { provide: UserService, useValue: userService },
            ],
        }).compile();
        useCase = module.get(UserGetTwoFactorStatusUseCase);
    });

    describe('execute', () => {
        it('maps and wraps the two-factor status', async () => {
            userService.mapTwoFactor.mockReturnValue({
                isEnabled: true,
                isPendingConfirmation: false,
                backupCodesRemaining: 1,
                confirmedAt: twoFactor.confirmedAt,
                lastUsedAt: null,
            });

            await expect(
                useCase.execute(buildUserContext(user))
            ).resolves.toEqual({
                data: {
                    isEnabled: true,
                    isPendingConfirmation: false,
                    backupCodesRemaining: 1,
                    confirmedAt: twoFactor.confirmedAt,
                    lastUsedAt: null,
                },
            });
            expect(userService.mapTwoFactor).toHaveBeenCalledWith(twoFactor);
        });

        it('maps a user without a two-factor row', async () => {
            const disabled = {
                isEnabled: false,
                isPendingConfirmation: false,
                backupCodesRemaining: 0,
                confirmedAt: null,
                lastUsedAt: null,
            };
            userService.mapTwoFactor.mockReturnValue(disabled);

            await expect(
                useCase.execute(buildUserContext({ ...user, twoFactor: null }))
            ).resolves.toEqual({
                data: disabled,
            });
            expect(userService.mapTwoFactor).toHaveBeenCalledWith(null);
        });
    });
});

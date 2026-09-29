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
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserTwoFactorHttpService } from '@modules/user/services/user.two-factor.http.service';
import { UserUtil } from '@modules/user/utils/user.util';
import type { UserLoginSetupTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';
import type { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import type { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import type { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import type { UserTwoFactorRegenerateBackupCodeRequestDto } from '@modules/user/dtos/request/user.two-factor-regenerate-backup-code.request.dto';
import type { UserTwoFactorSetupRequestDto } from '@modules/user/dtos/request/user.two-factor-setup.request.dto';
import type {
    IUser,
    IUserTwoFactorSetup,
} from '@modules/user/interfaces/user.interface';
import type { TwoFactor } from '@generated/prisma-client/client';

describe('UserTwoFactorHttpService', () => {
    const userTwoFactorDomain: MockProxy<UserTwoFactorDomain> =
        mock<UserTwoFactorDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();

    let service: UserTwoFactorHttpService;

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
        attempt: 0,
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
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
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
                UserTwoFactorHttpService,
                {
                    provide: UserTwoFactorDomain,
                    useValue: userTwoFactorDomain,
                },
                { provide: UserUtil, useValue: userUtil },
            ],
        }).compile();
        service = module.get(UserTwoFactorHttpService);
    });

    describe('loginVerifyTwoFactor', () => {
        it('wraps the tokens in a response envelope', async () => {
            const dto: UserLoginVerifyTwoFactorRequestDto = {
                challengeToken: 'challenge-token',
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
            };
            const tokens: IAuthToken = {
                tokenType: 'Bearer',
                roleType: EnumRoleType.user,
                expiresIn: 3600,
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            };
            userTwoFactorDomain.loginVerifyTwoFactor.mockResolvedValue(tokens);

            await expect(service.loginVerifyTwoFactor(dto)).resolves.toEqual({
                data: tokens,
            });
            expect(
                userTwoFactorDomain.loginVerifyTwoFactor
            ).toHaveBeenCalledWith('challenge-token', {
                code: dto.code,
                backupCode: undefined,
                method: dto.method,
            });
        });
    });

    describe('loginSetupTwoFactor', () => {
        it('wraps the backup codes in a response envelope', async () => {
            const dto: UserLoginSetupTwoFactorRequestDto = {
                challengeToken: 'challenge-token',
                code: '123456',
            };
            userTwoFactorDomain.loginSetupTwoFactor.mockResolvedValue([
                'CODE1',
                'CODE2',
            ]);

            await expect(service.loginSetupTwoFactor(dto)).resolves.toEqual({
                data: { backupCodes: ['CODE1', 'CODE2'] },
            });
            expect(
                userTwoFactorDomain.loginSetupTwoFactor
            ).toHaveBeenCalledWith('challenge-token', '123456');
        });
    });

    describe('getTwoFactorStatus', () => {
        it('maps and wraps the two-factor status', () => {
            userTwoFactorDomain.getTwoFactorStatus.mockReturnValue(twoFactor);
            userUtil.mapTwoFactor.mockReturnValue({
                isEnabled: true,
                isPendingConfirmation: false,
                backupCodesRemaining: 1,
                confirmedAt: twoFactor.confirmedAt,
                lastUsedAt: null,
            });

            expect(service.getTwoFactorStatus(user)).toEqual({
                data: {
                    isEnabled: true,
                    isPendingConfirmation: false,
                    backupCodesRemaining: 1,
                    confirmedAt: twoFactor.confirmedAt,
                    lastUsedAt: null,
                },
            });
            expect(userUtil.mapTwoFactor).toHaveBeenCalledWith(twoFactor);
        });
    });

    describe('setupTwoFactor', () => {
        it('passes the backup code through when given', async () => {
            const dto: UserTwoFactorSetupRequestDto = {
                backupCode: 'BACKUP1',
            };
            const setup: IUserTwoFactorSetup = {
                secret: 'secret',
                otpauthUrl: 'otpauth://totp/secret',
            };
            userTwoFactorDomain.setupTwoFactor.mockResolvedValue(setup);

            await expect(service.setupTwoFactor(user, dto)).resolves.toEqual({
                data: setup,
            });
            expect(userTwoFactorDomain.setupTwoFactor).toHaveBeenCalledWith(
                user,
                'BACKUP1'
            );
        });

        it('defaults the backup code to null when not given', async () => {
            const setup: IUserTwoFactorSetup = {
                secret: 'secret',
                otpauthUrl: 'otpauth://totp/secret',
            };
            userTwoFactorDomain.setupTwoFactor.mockResolvedValue(setup);

            await service.setupTwoFactor(user, {});

            expect(userTwoFactorDomain.setupTwoFactor).toHaveBeenCalledWith(
                user,
                null
            );
        });
    });

    describe('enableTwoFactor', () => {
        it('wraps the backup codes in a response envelope', async () => {
            const dto: UserTwoFactorEnableRequestDto = { code: '123456' };
            userTwoFactorDomain.enableTwoFactor.mockResolvedValue(['CODE1']);

            await expect(service.enableTwoFactor(user, dto)).resolves.toEqual({
                data: { backupCodes: ['CODE1'] },
            });
            expect(userTwoFactorDomain.enableTwoFactor).toHaveBeenCalledWith(
                user,
                '123456'
            );
        });
    });

    describe('disableTwoFactor', () => {
        it('delegates the verification to the domain', async () => {
            const dto: UserTwoFactorDisableRequestDto = {
                method: EnumAuthTwoFactorMethod.code,
                code: '123456',
            };

            await service.disableTwoFactor(user, dto);

            expect(userTwoFactorDomain.disableTwoFactor).toHaveBeenCalledWith(
                user,
                {
                    code: dto.code,
                    backupCode: undefined,
                    method: dto.method,
                }
            );
        });
    });

    describe('regenerateTwoFactorBackupCodes', () => {
        it('wraps the fresh backup codes in a response envelope', async () => {
            const dto: UserTwoFactorRegenerateBackupCodeRequestDto = {
                code: '123456',
            };
            userTwoFactorDomain.regenerateTwoFactorBackupCodes.mockResolvedValue(
                ['CODE1', 'CODE2']
            );

            await expect(
                service.regenerateTwoFactorBackupCodes(user, dto)
            ).resolves.toEqual({ data: { backupCodes: ['CODE1', 'CODE2'] } });
            expect(
                userTwoFactorDomain.regenerateTwoFactorBackupCodes
            ).toHaveBeenCalledWith(user, '123456');
        });
    });

    describe('resetTwoFactorByAdmin', () => {
        it('delegates to the domain', async () => {
            await service.resetTwoFactorByAdmin('user-marten', 'admin-marten');

            expect(
                userTwoFactorDomain.resetTwoFactorByAdmin
            ).toHaveBeenCalledWith('user-marten', 'admin-marten');
        });
    });
});

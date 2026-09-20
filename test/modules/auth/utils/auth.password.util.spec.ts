import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Duration } from 'luxon';

import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumPasswordHistoryType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    type PasswordHistory,
    type User,
} from '@generated/prisma-client';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';

describe('AuthPasswordUtil', () => {
    const helperHashService = {
        bcryptCompare: vi.fn<HelperHashService['bcryptCompare']>(),
        bcryptGenerateSalt: vi.fn<HelperHashService['bcryptGenerateSalt']>(),
        bcryptHash: vi.fn<HelperHashService['bcryptHash']>(),
    } satisfies Pick<
        HelperHashService,
        'bcryptCompare' | 'bcryptGenerateSalt' | 'bcryptHash'
    >;
    const helperDateService = {
        create: vi.fn<HelperDateService['create']>(),
        createDuration: vi.fn<HelperDateService['createDuration']>(),
        forward: vi.fn<HelperDateService['forward']>(),
    } satisfies Pick<
        HelperDateService,
        'create' | 'createDuration' | 'forward'
    >;
    const helperStringService = {
        random: vi.fn<HelperStringService['random']>(),
    } satisfies Pick<HelperStringService, 'random'>;
    const configService = new ConfigService({
        'auth.password.expiredInMs': 86_400_000,
        'auth.password.expiredTemporaryInMs': 3_600_000,
        'auth.password.saltLength': 12,
        'auth.password.periodInDays': 90,
        'auth.password.attempt': true,
        'auth.password.maxAttempt': 5,
    });
    const now = new Date('2026-01-01T00:00:00.000Z');
    const user = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: true,
        verifiedAt: now,
        email: 'user@example.com',
        roleId: 'role-id',
        password: 'hash',
        passwordExpired: null,
        passwordCreated: now,
        passwordAttempt: 0,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
    } satisfies User;

    let service: AuthPasswordUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthPasswordUtil,
                { provide: HelperHashService, useValue: helperHashService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        service = moduleRef.get(AuthPasswordUtil);
    });

    it('builds a password record with the temporary expiry policy', () => {
        const temporaryExpiry = new Date('2026-01-01T01:00:00.000Z');
        const periodExpiry = new Date('2026-04-01T00:00:00.000Z');
        helperDateService.create.mockReturnValue(now);
        helperDateService.createDuration
            .mockReturnValueOnce(
                Duration.fromObject({ milliseconds: 3_600_000 })
            )
            .mockReturnValueOnce(Duration.fromObject({ days: 90 }));
        helperDateService.forward
            .mockReturnValueOnce(temporaryExpiry)
            .mockReturnValueOnce(periodExpiry);
        helperHashService.bcryptGenerateSalt.mockReturnValue('salt');
        helperHashService.bcryptHash.mockReturnValue('password-hash');
        expect(service.createPassword('password', { temporary: true })).toEqual(
            {
                passwordHash: 'password-hash',
                passwordExpired: temporaryExpiry,
                passwordCreated: now,
                passwordPeriodExpired: periodExpiry,
            }
        );
        expect(helperHashService.bcryptHash).toHaveBeenCalledWith(
            'password',
            'salt'
        );
    });

    it.each([
        [4, false],
        [5, true],
        [6, true],
    ])('evaluates password attempt count %s', (passwordAttempt, expected) => {
        expect(service.checkPasswordAttempt({ ...user, passwordAttempt })).toBe(
            expected
        );
    });

    it('treats a missing expiry as active and a past expiry as expired', () => {
        helperDateService.create.mockReturnValue(
            new Date('2026-01-02T00:00:00.000Z')
        );

        expect(service.checkPasswordExpired(null)).toBe(false);
        expect(
            service.checkPasswordExpired(new Date('2026-01-01T23:59:59.999Z'))
        ).toBe(true);
    });

    it('returns the first password-history record matching the candidate', () => {
        const histories = [
            {
                id: 'history-1',
                userId: 'user-id',
                password: 'old-hash-1',
                type: EnumPasswordHistoryType.profile,
                expiredAt: new Date('2026-04-01T00:00:00.000Z'),
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
            },
            {
                id: 'history-2',
                userId: 'user-id',
                password: 'old-hash-2',
                type: EnumPasswordHistoryType.forgot,
                expiredAt: new Date('2026-04-02T00:00:00.000Z'),
                createdAt: new Date('2026-01-02T00:00:00.000Z'),
                createdBy: null,
            },
        ] satisfies PasswordHistory[];
        helperHashService.bcryptCompare.mockImplementation(
            (_password, hash) => hash === 'old-hash-2'
        );

        expect(service.checkPasswordPeriod(histories, 'candidate')).toBe(
            histories[1]
        );
    });

    it('delegates password verification to the configured password hash', () => {
        helperHashService.bcryptCompare.mockReturnValue(true);

        expect(service.validatePassword('candidate', 'stored-hash')).toBe(true);
        expect(helperHashService.bcryptCompare).toHaveBeenCalledWith(
            'candidate',
            'stored-hash'
        );
    });

    it('generates a ten-character random password', () => {
        helperStringService.random.mockReturnValue('random-pass');

        expect(service.createPasswordRandom()).toBe('random-pass');
        expect(helperStringService.random).toHaveBeenCalledWith(10);
        expect(service.getPasswordPeriodInDays()).toBe(90);
    });
});

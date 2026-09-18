import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
} from '@generated/prisma-client';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserImportDomain', () => {
    const userRepository = {
        findByEmails: vi.fn<UserRepository['findByEmails']>(),
        findByUsernames: vi.fn<UserRepository['findByUsernames']>(),
        findExport: vi.fn<UserRepository['findExport']>(),
    } satisfies Pick<
        UserRepository,
        'findByEmails' | 'findByUsernames' | 'findExport'
    >;
    const roleDomain = {
        getByName: vi.fn<RoleDomain['getByName']>(),
    } satisfies Pick<RoleDomain, 'getByName'>;
    const countryDomain = {
        getIdByAlpha2Code: vi.fn<CountryDomain['getIdByAlpha2Code']>(),
    } satisfies Pick<CountryDomain, 'getIdByAlpha2Code'>;
    const userUtil = {
        checkBadWord: vi.fn<UserUtil['checkBadWord']>(),
    } satisfies Pick<UserUtil, 'checkBadWord'>;
    const onboardingDomain = {
        buildPersonalWorkspaceContexts:
            vi.fn<UserOnboardingDomain['buildPersonalWorkspaceContexts']>(),
    } satisfies Pick<UserOnboardingDomain, 'buildPersonalWorkspaceContexts'>;
    const passwordUtil = {
        createPasswordRandom: vi.fn<AuthPasswordUtil['createPasswordRandom']>(),
        createPassword: vi.fn<AuthPasswordUtil['createPassword']>(),
    } satisfies Pick<
        AuthPasswordUtil,
        'createPasswordRandom' | 'createPassword'
    >;
    const databaseUtil = {
        createId: vi.fn<DatabaseUtil['createId']>(),
    } satisfies Pick<DatabaseUtil, 'createId'>;
    const notificationQueue = {
        sendWelcomeByAdmin: vi.fn<NotificationQueue['sendWelcomeByAdmin']>(),
    } satisfies Pick<NotificationQueue, 'sendWelcomeByAdmin'>;
    const helperDateService = {
        formatToIso: vi.fn<HelperDateService['formatToIso']>(),
    } satisfies Pick<HelperDateService, 'formatToIso'>;
    const configService = {
        get: vi.fn(
            (key: string) =>
                ({
                    'user.default.role': 'User',
                    'user.default.country': 'ID',
                    'user.maxDataExport': 100,
                })[key]
        ),
    } satisfies Pick<ConfigService, 'get'>;

    let domain: UserImportDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        roleDomain.getByName.mockResolvedValue({
            id: 'role-id',
            name: 'User',
            type: EnumRoleType.user,
        } as never);
        countryDomain.getIdByAlpha2Code.mockResolvedValue('country-id');
        userRepository.findByEmails.mockResolvedValue([]);
        userRepository.findByUsernames.mockResolvedValue([]);
        userUtil.checkBadWord.mockResolvedValue(false);
        databaseUtil.createId.mockReturnValue('generated-id');
        onboardingDomain.buildPersonalWorkspaceContexts.mockReturnValue([]);
        domain = new UserImportDomain(
            userRepository as unknown as UserRepository,
            roleDomain as unknown as RoleDomain,
            countryDomain as unknown as CountryDomain,
            userUtil as unknown as UserUtil,
            onboardingDomain as unknown as UserOnboardingDomain,
            passwordUtil as unknown as AuthPasswordUtil,
            databaseUtil as unknown as DatabaseUtil,
            notificationQueue as unknown as NotificationQueue,
            helperDateService as unknown as HelperDateService,
            configService as unknown as ConfigService
        );
    });

    it('prepares imported users through the consolidated repository contract', async () => {
        passwordUtil.createPasswordRandom.mockReturnValue('plain');
        passwordUtil.createPassword.mockReturnValue({
            passwordHash: 'hash',
        } as never);
        const result = await domain.prepareImportByAdmin(
            [{ email: 'user@example.com', username: 'user', name: undefined }],
            'admin-id'
        );
        expect(result.inputs[0]).toEqual(
            expect.objectContaining({
                email: 'user@example.com',
                username: 'user',
                roleId: 'role-id',
                countryId: 'country-id',
                signUpFrom: EnumUserSignUpFrom.admin,
                signUpWith: EnumUserSignUpWith.credential,
                createdBy: 'admin-id',
            })
        );
        expect(userRepository.findByEmails).toHaveBeenCalledWith([
            'user@example.com',
        ]);
    });

    it('delegates export filters to the consolidated repository', async () => {
        userRepository.findExport.mockResolvedValue([]);
        const status = { status: { in: ['active'] } };
        await expect(
            domain.exportByAdmin(status as never, undefined, undefined)
        ).resolves.toEqual([]);
        expect(userRepository.findExport).toHaveBeenCalledWith(
            status,
            null,
            null,
            101
        );
    });
});

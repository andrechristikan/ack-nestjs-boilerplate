import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

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
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const countryDomain: MockProxy<CountryDomain> = mock<CountryDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userOnboardingDomain: MockProxy<UserOnboardingDomain> =
        mock<UserOnboardingDomain>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configValues: Record<string, unknown> = {
        'user.default.role': 'User',
        'user.default.country': 'ID',
        'user.maxDataExport': 100,
    };

    let domain: UserImportDomain;

    beforeEach(async () => {
        vi.mocked(configService.get).mockImplementation(
            (key: string) => configValues[key]
        );
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
        userOnboardingDomain.buildPersonalWorkspaceContexts.mockReturnValue([]);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserImportDomain,
                { provide: UserRepository, useValue: userRepository },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: CountryDomain, useValue: countryDomain },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserOnboardingDomain,
                    useValue: userOnboardingDomain,
                },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        domain = moduleRef.get(UserImportDomain);
    });

    it('prepares imported users through the consolidated repository contract', async () => {
        authPasswordUtil.createPasswordRandom.mockReturnValue('plain');
        authPasswordUtil.createPassword.mockReturnValue({
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

import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { ConfigService } from '@nestjs/config';
import { UserUtil } from '@modules/user/utils/user.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { CountryService } from '@modules/country/services/country.service';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import type { IUserProfile } from '@modules/user/interfaces/user.interface';
import { UserGetProfileUseCase } from '@modules/user/use-cases/user.get-profile.use-case';
import { buildUserContext } from '@test/unit/helpers/test.unit.request.helper';

describe('UserGetProfileUseCase', () => {
    const countryService: MockProxy<CountryService> = mock<CountryService>();
    const userMobileNumberService: MockProxy<UserMobileNumberService> =
        mock<UserMobileNumberService>();

    let useCase: UserGetProfileUseCase;

    const sableCountry = {
        id: 'country-sable',
        name: 'Sable Coast',
        alpha2Code: 'SB',
        alpha3Code: 'SBL',
        phoneCode: ['+1'],
        continent: 'Atlantis',
        timezone: 'UTC',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const profile: IUserProfile = {
        id: 'user-sable',
        name: 'Sable Grove',
        username: 'sableGrove',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'sable@example.com',
        roleId: 'role-sable',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.female,
        countryId: 'country-sable',
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
            id: 'role-sable',
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
        mobileNumbers: [
            {
                id: 'mobile-sable',
                userId: 'user-sable',
                countryId: 'country-sable',
                phoneCode: '+1',
                number: '+12025550123',
                isVerified: true,
                verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: null,
                country: sableCountry,
            },
        ],
        country: sableCountry,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserGetProfileUseCase,
                { provide: CountryService, useValue: countryService },
                {
                    provide: UserMobileNumberService,
                    useValue: userMobileNumberService,
                },
                UserUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'message.availableLanguages': ['en'],
                    }),
                },
            ],
        }).compile();
        useCase = module.get(UserGetProfileUseCase);
    });

    describe('execute', () => {
        const { country, mobileNumbers, ...user } = profile;
        const userContext = buildUserContext({
            ...user,
            role: profile.role,
        });

        it('returns the context user censored, with the country and the mobile numbers read together', async () => {
            countryService.getOne.mockResolvedValue(country);
            userMobileNumberService.getListByUser.mockResolvedValue(
                mobileNumbers
            );

            await expect(useCase.execute(userContext)).resolves.toEqual({
                data: {
                    ...userContext.user,
                    email: '*****@e**********',
                    country,
                    mobileNumbers: [
                        { ...mobileNumbers[0]!, number: '+120******23' },
                    ],
                },
            });

            expect(countryService.getOne).toHaveBeenCalledWith(
                userContext.user.countryId
            );
            expect(userMobileNumberService.getListByUser).toHaveBeenCalledWith(
                userContext.user.id
            );
        });
    });
});

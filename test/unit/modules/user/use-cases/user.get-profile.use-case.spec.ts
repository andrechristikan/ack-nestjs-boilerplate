import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import type { IUserProfile } from '@modules/user/interfaces/user.interface';
import { UserGetProfileUseCase } from '@modules/user/use-cases/user.get-profile.use-case';
import {
    buildUser,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserGetProfileUseCase', () => {
    const userProfileService: MockProxy<UserProfileService> =
        mock<UserProfileService>();

    let useCase: UserGetProfileUseCase;

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
            scope: EnumRoleScope.platform,
            key: 'user',
            name: 'user',
            policyRevision: 0,
        },
        mobileNumbers: [],
        country: {
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
        },
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserGetProfileUseCase,
                { provide: UserProfileService, useValue: userProfileService },
            ],
        }).compile();
        useCase = module.get(UserGetProfileUseCase);
    });

    describe('execute', () => {
        const userContext = buildUserContext(
            buildUser('user-sable', 'sable@example.com')
        );
        const authContext = buildAuthJwtAccessContext(userContext.user.id);
        it('wraps the profile in a response envelope', async () => {
            userProfileService.getProfile.mockResolvedValue(profile);

            await expect(useCase.execute(authContext)).resolves.toEqual({
                data: profile,
            });
        });
    });
});

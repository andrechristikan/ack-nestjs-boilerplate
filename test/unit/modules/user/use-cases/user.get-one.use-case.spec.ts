import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumPolicyAction,
    EnumPolicySubject,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { UserService } from '@modules/user/services/user.service';
import type {
    IUser,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { UserGetOneUseCase } from '@modules/user/use-cases/user.get-one.use-case';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('UserGetOneUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();

    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const scoped: IPolicyWhereInput<'User'> = { id: 'scoped-1' };

    let useCase: UserGetOneUseCase;

    const baseUser: IUser = {
        id: 'user-cinder',
        name: 'Cinder Wolfe',
        username: 'cinder2wolfe',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'cinder@example.com',
        roleId: 'role-cinder',
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
        countryId: 'country-cinder',
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
            id: 'role-cinder',
            scope: EnumRoleScope.platform,
            key: 'user',
            name: 'user',
            policyRevision: 0,
        },
    };

    const baseProfile: IUserProfile = {
        ...baseUser,
        mobileNumbers: [],
        country: {
            id: baseUser.countryId,
            name: 'Cinder Coast',
            alpha2Code: 'CD',
            alpha3Code: 'CDL',
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
        policyAbilityService.scope.mockReturnValue(scoped);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserGetOneUseCase,
                { provide: UserService, useValue: userService },
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
            ],
        }).compile();
        useCase = module.get(UserGetOneUseCase);
    });

    describe('execute', () => {
        it('wraps the user in a response envelope', async () => {
            const user = baseUser;
            userService.getOne.mockResolvedValue(baseProfile);

            await expect(
                useCase.execute(policyContext, user.id)
            ).resolves.toMatchObject({
                data: { id: user.id },
            });
        });

        it('forwards the read scope on the user to the lookup', async () => {
            userService.getOne.mockResolvedValue(baseProfile);

            await useCase.execute(policyContext, 'user-cinder');

            expect(policyAbilityService.scope).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.read,
                EnumPolicySubject.User
            );
            expect(userService.getOne).toHaveBeenCalledWith(
                'user-cinder',
                scoped
            );
        });

        it('answers the not-found failure for a user the scope does not reach', async () => {
            userService.getOne.mockRejectedValue(new UserNotFoundException());

            await expect(
                useCase.execute(policyContext, 'user-cinder')
            ).rejects.toBeInstanceOf(UserNotFoundException);
        });

        it('leaves the lookup uncalled when the ability holds no read rule', async () => {
            policyAbilityService.scope.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                useCase.execute(policyContext, 'user-cinder')
            ).rejects.toBeInstanceOf(PolicyForbiddenException);
            expect(userService.getOne).not.toHaveBeenCalled();
        });
    });
});

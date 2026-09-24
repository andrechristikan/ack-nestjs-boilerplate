import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import type { UserCheckEmailRequestDto } from '@modules/user/dtos/request/user.check-email.request.dto';
import type { UserCheckUsernameRequestDto } from '@modules/user/dtos/request/user.check-username.request.dto';
import type { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import type { UserListRequestDto } from '@modules/user/dtos/request/user.list.request.dto';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import type {
    IUser,
    IUserCheckEmail,
    IUserCheckUsername,
    IUserCreateByAdminPrepared,
    IUserList,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserHttpService } from '@modules/user/services/user.http.service';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';

describe('UserHttpService', () => {
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const userOnboardingDomain: MockProxy<UserOnboardingDomain> =
        mock<UserOnboardingDomain>();
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const role = {
        id: 'role-id',
        name: 'User',
        description: null,
        type: EnumRoleType.user,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        policies: [],
    };
    const userListItem = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: true,
        verifiedAt: now,
        email: 'user@example.com',
        roleId: 'role-id',
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
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
        photo: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role,
        twoFactor: null,
    } satisfies IUserList;
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [userListItem],
    };
    const offsetParams = {
        where: undefined,
        limit: 20,
        skip: 0,
        orderBy: [],
    };
    const offsetStorePatch = {
        page: 1,
        perPage: 20,
        orderBy: [],
        availableSearch: [],
        availableOrderBy: ['createdAt'],
    };
    const userProfile = {
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
        role: {
            id: 'role-id',
            name: 'User',
            description: null,
            type: EnumRoleType.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
        mobileNumbers: [],
        country: {
            id: 'country-id',
            name: 'Country',
            alpha2Code: 'CC',
            alpha3Code: 'CCC',
            continent: 'Continent',
            timezone: 'UTC',
            phoneCodes: ['+1'],
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        },
        photo: null,
    } satisfies IUserProfile;
    const workspaceContext = {
        type: 'personal',
        workspaceId: 'workspace-id',
        slugCandidates: ['candidate'],
        name: 'user',
    } as never;
    const preparedInputWithPassword = {
        userId: 'user-id',
        email: 'user@example.com',
        name: 'User',
        username: 'user',
        countryId: 'country-id',
        roleId: 'role-id',
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        isVerified: false,
        termPolicy: {} as never,
        acceptedTermPolicyTypes: [],
        password: {
            passwordHash: 'hash',
            passwordExpired: now,
            passwordCreated: now,
            passwordPeriodExpired: now,
        },
        passwordHistoryType: null,
        verification: null,
        workspaceContext,
        createdBy: 'admin-id',
    } satisfies IUserCreateByAdminPrepared['input'];
    const preparedInputWithoutPassword = {
        ...preparedInputWithPassword,
        password: null,
    } satisfies IUserCreateByAdminPrepared['input'];
    const createdUser = { id: 'created-user-id' } as IUser;

    let service: UserHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserHttpService,
                { provide: UserDomain, useValue: userDomain },
                {
                    provide: UserOnboardingDomain,
                    useValue: userOnboardingDomain,
                },
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        service = module.get(UserHttpService);
    });

    describe('getListOffsetByAdmin', () => {
        it('merges status, roleId and countryId filters when provided', async () => {
            const query = {
                status: 'active',
                roleId: 'role-id',
                countryId: 'country-id',
            } satisfies UserListRequestDto;
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            const statusWhere = { status: { in: ['active'] } };
            const roleIdWhere = { roleId: 'role-id' };
            const countryIdWhere = { countryId: 'country-id' };
            paginationQueryUtil.inEnum.mockReturnValue({
                where: statusWhere,
                storeFilter: { status: ['active'] },
            } as never);
            paginationQueryUtil.equalString
                .mockReturnValueOnce({
                    where: roleIdWhere,
                    storeFilter: { roleId: 'role-id' },
                } as never)
                .mockReturnValueOnce({
                    where: countryIdWhere,
                    storeFilter: { countryId: 'country-id' },
                } as never);
            userDomain.getListOffsetByAdmin.mockResolvedValue(offsetPage);

            const result = await service.getListOffsetByAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...offsetStorePatch,
                    filters: {
                        status: ['active'],
                        roleId: 'role-id',
                        countryId: 'country-id',
                    },
                }
            );
            expect(userDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetParams,
                statusWhere,
                roleIdWhere,
                countryIdWhere
            );
            expect(result).toEqual(offsetPage);
        });

        it('merges an empty filter set when no filters are provided', async () => {
            const query = {} satisfies UserListRequestDto;
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.inEnum.mockReturnValue(undefined);
            paginationQueryUtil.equalString.mockReturnValue(undefined);
            userDomain.getListOffsetByAdmin.mockResolvedValue(offsetPage);

            await service.getListOffsetByAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...offsetStorePatch,
                    filters: {},
                }
            );
            expect(userDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetParams,
                undefined,
                undefined,
                undefined
            );
        });
    });

    describe('getOne', () => {
        it('delegates to the domain and wraps the profile', async () => {
            userDomain.getOne.mockResolvedValue(userProfile);

            const result = await service.getOne('user-id');

            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(result).toEqual({ data: userProfile });
        });
    });

    describe('createByAdmin', () => {
        const request = {
            countryId: 'country-id',
            email: 'user@example.com',
            name: 'User',
            roleId: 'role-id',
            username: 'user',
        } satisfies UserCreateRequestDto;

        it('notifies the welcome email when the created input carries a password', async () => {
            userDomain.prepareCreateByAdmin.mockResolvedValue({
                input: preparedInputWithPassword,
                passwordString: 'plain-password',
            });
            userOnboardingDomain.getCreateTimeoutInMs.mockReturnValue(5000);
            workspaceDomain.commitOnboarding.mockResolvedValue([createdUser]);
            userDomain.notifyWelcomeByAdmin.mockResolvedValue(undefined);

            const result = await service.createByAdmin(request, 'admin-id');

            expect(userDomain.prepareCreateByAdmin).toHaveBeenCalledWith(
                {
                    countryId: request.countryId,
                    email: request.email,
                    name: request.name,
                    roleId: request.roleId,
                    username: request.username,
                },
                'admin-id'
            );
            expect(workspaceDomain.commitOnboarding).toHaveBeenCalledWith(
                [preparedInputWithPassword],
                EnumUserCreateMode.admin,
                5000,
                EnumActivityLogAction.adminUserCreate
            );
            expect(userDomain.notifyWelcomeByAdmin).toHaveBeenCalledWith(
                createdUser.id,
                'plain-password',
                preparedInputWithPassword.password!.passwordCreated,
                preparedInputWithPassword.password!.passwordExpired,
                'admin-id'
            );
            expect(result).toEqual({ data: { id: createdUser.id } });
        });

        it('skips the welcome email when the created input carries no password', async () => {
            userDomain.prepareCreateByAdmin.mockResolvedValue({
                input: preparedInputWithoutPassword,
                passwordString: 'plain-password',
            });
            userOnboardingDomain.getCreateTimeoutInMs.mockReturnValue(5000);
            workspaceDomain.commitOnboarding.mockResolvedValue([createdUser]);

            const result = await service.createByAdmin(request, 'admin-id');

            expect(userDomain.notifyWelcomeByAdmin).not.toHaveBeenCalled();
            expect(result).toEqual({ data: { id: createdUser.id } });
        });
    });

    describe('updateStatusByAdmin', () => {
        it('delegates to the domain and returns an empty response', async () => {
            const request = {
                status: EnumUserStatus.inactive,
            } satisfies UserUpdateStatusRequestDto;
            userDomain.updateStatusByAdmin.mockResolvedValue(undefined);

            const result = await service.updateStatusByAdmin(
                'user-id',
                request,
                'admin-id'
            );

            expect(userDomain.updateStatusByAdmin).toHaveBeenCalledWith(
                'user-id',
                EnumUserStatus.inactive,
                'admin-id'
            );
            expect(result).toEqual({});
        });
    });

    describe('checkUsername', () => {
        it('delegates to the domain and wraps the result', async () => {
            const request = {
                username: 'user',
            } satisfies UserCheckUsernameRequestDto;
            const checkUsername = {
                badWord: false,
                exist: false,
                pattern: true,
            } satisfies IUserCheckUsername;
            userDomain.checkUsername.mockResolvedValue(checkUsername);

            const result = await service.checkUsername(request);

            expect(userDomain.checkUsername).toHaveBeenCalledWith('user');
            expect(result).toEqual({ data: checkUsername });
        });
    });

    describe('checkEmail', () => {
        it('delegates to the domain and wraps the result', async () => {
            const request = {
                email: 'user@example.com',
            } satisfies UserCheckEmailRequestDto;
            const checkEmail = {
                badWord: false,
                exist: false,
            } satisfies IUserCheckEmail;
            userDomain.checkEmail.mockResolvedValue(checkEmail);

            const result = await service.checkEmail(request);

            expect(userDomain.checkEmail).toHaveBeenCalledWith(
                'user@example.com'
            );
            expect(result).toEqual({ data: checkEmail });
        });
    });

    describe('deleteSelf', () => {
        it('delegates to the domain', async () => {
            userDomain.deleteSelf.mockResolvedValue(undefined);

            await service.deleteSelf('user-id');

            expect(userDomain.deleteSelf).toHaveBeenCalledWith('user-id');
        });
    });
});

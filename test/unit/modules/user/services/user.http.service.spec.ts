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
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { OnboardingDomain } from '@modules/onboarding/domains/onboarding.domain';
import { UserHttpService } from '@modules/user/services/user.http.service';
import type { UserCheckEmailRequestDto } from '@modules/user/dtos/request/user.check-email.request.dto';
import type { UserCheckUsernameRequestDto } from '@modules/user/dtos/request/user.check-username.request.dto';
import type { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import type { UserListRequestDto } from '@modules/user/dtos/request/user.list.request.dto';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import type { IUser, IUserList } from '@modules/user/interfaces/user.interface';

describe('UserHttpService', () => {
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const onboardingDomain: MockProxy<OnboardingDomain> =
        mock<OnboardingDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let service: UserHttpService;

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
            id: 'role-cinder',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserHttpService,
                { provide: UserDomain, useValue: userDomain },
                { provide: OnboardingDomain, useValue: onboardingDomain },
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
        const query: UserListRequestDto = { page: 1, perPage: 20 };
        const response: IResponsePaginationReturn<IUserList> = {
            type: EnumPaginationType.offset,
            count: 0,
            perPage: 20,
            page: 1,
            totalPage: 0,
            hasNext: false,
            hasPrevious: false,
            data: [],
        };

        it('merges every filter into the pagination store and calls the domain with each where', async () => {
            const params = { skip: 0, limit: 20, orderBy: [] };
            paginationQueryUtil.offset.mockReturnValue({
                params,
                storePatch: { filters: {} },
            });
            paginationQueryUtil.inEnum.mockReturnValue({
                where: { status: { in: [EnumUserStatus.active] } },
                storeFilter: { status: [EnumUserStatus.active] },
            });
            paginationQueryUtil.equalString
                .mockReturnValueOnce({
                    where: { roleId: { equals: 'role-cinder' } },
                    storeFilter: { roleId: 'role-cinder' },
                })
                .mockReturnValueOnce({
                    where: { countryId: { equals: 'country-cinder' } },
                    storeFilter: { countryId: 'country-cinder' },
                });
            userDomain.getListOffsetByAdmin.mockResolvedValue(response);

            await expect(service.getListOffsetByAdmin(query)).resolves.toBe(
                response
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                expect.objectContaining({
                    filters: expect.objectContaining({
                        status: [EnumUserStatus.active],
                        roleId: 'role-cinder',
                        countryId: 'country-cinder',
                    }),
                })
            );
            expect(userDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                params,
                { status: { in: [EnumUserStatus.active] } },
                { roleId: { equals: 'role-cinder' } },
                { countryId: { equals: 'country-cinder' } }
            );
        });

        it('calls the domain with undefined wheres when no filter applies', async () => {
            const params = { skip: 0, limit: 20, orderBy: [] };
            paginationQueryUtil.offset.mockReturnValue({
                params,
                storePatch: { filters: {} },
            });
            paginationQueryUtil.inEnum.mockReturnValue(null);
            paginationQueryUtil.equalString.mockReturnValue(null);
            userDomain.getListOffsetByAdmin.mockResolvedValue(response);

            await service.getListOffsetByAdmin(query);

            expect(userDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                params,
                undefined,
                undefined,
                undefined
            );
        });
    });

    describe('getOne', () => {
        it('wraps the user in a response envelope', async () => {
            const user = baseUser;
            userDomain.getOne.mockResolvedValue({
                ...user,
                mobileNumbers: [],
                country: {
                    id: user.countryId,
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
            });

            await expect(service.getOne(user.id)).resolves.toMatchObject({
                data: { id: user.id },
            });
        });
    });

    describe('createByAdmin', () => {
        const dto: UserCreateRequestDto = {
            username: 'cinder2wolfe',
            email: 'cinder@example.com' as Lowercase<string>,
            roleId: 'role-cinder',
            countryId: 'country-cinder',
        };

        it('delegates creation to OnboardingDomain and returns the id', async () => {
            onboardingDomain.createByAdmin.mockResolvedValue('user-cinder');

            const result = await service.createByAdmin(dto, 'admin-cinder');

            expect(result).toEqual({ data: { id: 'user-cinder' } });
            expect(onboardingDomain.createByAdmin).toHaveBeenCalledWith(
                {
                    username: dto.username,
                    email: dto.email,
                    name: null,
                    roleId: dto.roleId,
                    countryId: dto.countryId,
                },
                'admin-cinder'
            );
        });

        it('forwards the name when the dto carries one', async () => {
            onboardingDomain.createByAdmin.mockResolvedValue('user-cinder');

            await service.createByAdmin(
                { ...dto, name: 'Cinder Wolfe' },
                'admin-cinder'
            );

            expect(onboardingDomain.createByAdmin).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Cinder Wolfe' }),
                'admin-cinder'
            );
        });
    });

    describe('updateStatusByAdmin', () => {
        it('delegates to the domain and returns an empty response', async () => {
            const dto: UserUpdateStatusRequestDto = {
                status: EnumUserStatus.blocked,
            };

            await expect(
                service.updateStatusByAdmin('user-cinder', dto, 'admin-cinder')
            ).resolves.toEqual({});
            expect(userDomain.updateStatusByAdmin).toHaveBeenCalledWith(
                'user-cinder',
                dto.status,
                'admin-cinder'
            );
        });
    });

    describe('checkUsername', () => {
        it('wraps the check in a response envelope', async () => {
            const dto: UserCheckUsernameRequestDto = {
                username: 'cinder2wolfe' as Lowercase<string>,
            };
            userDomain.checkUsername.mockResolvedValue({
                badWord: false,
                exist: false,
                pattern: false,
            });

            await expect(service.checkUsername(dto)).resolves.toEqual({
                data: { badWord: false, exist: false, pattern: false },
            });
        });
    });

    describe('checkEmail', () => {
        it('wraps the check in a response envelope', async () => {
            const dto: UserCheckEmailRequestDto = {
                email: 'cinder@example.com' as Lowercase<string>,
            };
            userDomain.checkEmail.mockResolvedValue({
                badWord: false,
                exist: true,
            });

            await expect(service.checkEmail(dto)).resolves.toEqual({
                data: { badWord: false, exist: true },
            });
        });
    });

    describe('deleteSelf', () => {
        it('delegates to the domain', async () => {
            await service.deleteSelf('user-cinder');

            expect(userDomain.deleteSelf).toHaveBeenCalledWith('user-cinder');
        });
    });
});

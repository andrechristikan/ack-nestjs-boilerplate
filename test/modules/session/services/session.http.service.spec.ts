import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { subject } from '@casl/ability';

import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client/client';
import {
    SessionCursorAvailableOrderBy,
    SessionDefaultAvailableOrderBy,
} from '@modules/session/constants/session.list.constant';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { SessionDomain } from '@modules/session/domains/session.domain';
import type {
    ISession,
    ISessionList,
} from '@modules/session/interfaces/session.interface';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { SessionHttpService } from '@modules/session/services/session.http.service';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import type { IUserProfile } from '@modules/user/interfaces/user.interface';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';

describe('SessionHttpService', () => {
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const scopeWhere = { userId: 'user-id' };
    const item = mock<ISessionList>();
    const session = mock<ISession>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const storedUser = {
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
            policyRevision: 0,
            scope: EnumRoleScope.platform,
            key: EnumRolePlatformKey.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
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
        filters: {},
    };
    const cursorParams = {
        where: undefined,
        limit: 20,
        cursor: undefined,
        cursorField: 'id',
        orderBy: [],
    };
    const cursorStorePatch = {
        perPage: 20,
        cursor: undefined,
        orderBy: [],
        availableSearch: [],
        availableOrderBy: ['createdAt'],
        filters: {},
    };
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [item],
    };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        count: 1,
        perPage: 20,
        hasNext: false,
        cursor: undefined,
        data: [item],
    };

    let service: SessionHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityDomain.scope.mockReturnValue(scopeWhere);
        userDomain.getOne.mockResolvedValue(storedUser);
        sessionDomain.validateActive.mockResolvedValue(session);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionHttpService,
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: UserDomain, useValue: userDomain },
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = module.get(SessionHttpService);
    });

    describe('getListOffsetByAdmin', () => {
        it('loads the parent user, authorizes read, then lists under the Session scope', async () => {
            const callOrder: string[] = [];
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            userDomain.getOne.mockImplementation(async () => {
                callOrder.push('parent');
                return storedUser;
            });
            policyAbilityDomain.authorize.mockImplementation(() => {
                callOrder.push('authorize');
            });
            sessionDomain.getListOffsetByAdmin.mockImplementation(async () => {
                callOrder.push('list');
                return offsetPage;
            });

            await service.getListOffsetByAdmin('user-id', {});

            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.User, storedUser)
            );
            expect(policyAbilityDomain.scope).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.Session
            );
            expect(sessionDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-id',
                offsetParams,
                undefined,
                scopeWhere
            );
            expect(callOrder).toEqual(['parent', 'authorize', 'list']);
        });

        it('throws UserNotFoundException and never lists when the parent lookup misses', async () => {
            userDomain.getOne.mockRejectedValue(new UserNotFoundException());

            await expect(
                service.getListOffsetByAdmin('user-id', {})
            ).rejects.toThrow(UserNotFoundException);
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(sessionDomain.getListOffsetByAdmin).not.toHaveBeenCalled();
        });

        it('passes the revoke filter and the read predicate of Session to the domain list', async () => {
            const query = { isRevoked: true };
            const isRevokedWhere = { isRevoked: true };
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.equalBoolean.mockReturnValue({
                where: isRevokedWhere,
                storeFilter: { isRevoked: true },
            } as never);
            sessionDomain.getListOffsetByAdmin.mockResolvedValue(offsetPage);

            const result = await service.getListOffsetByAdmin('user-id', query);

            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.User, storedUser)
            );
            expect(policyAbilityDomain.scope).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.Session
            );
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: SessionDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.equalBoolean).toHaveBeenCalledWith(
                Prisma.SessionScalarFieldEnum.isRevoked,
                true
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...offsetStorePatch, filters: { isRevoked: true } }
            );
            expect(sessionDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-id',
                offsetParams,
                isRevokedWhere,
                scopeWhere
            );
            expect(result).toEqual(offsetPage);
        });

        it('merges an empty filter set and passes undefined filters when no revoke filter is given', async () => {
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.equalBoolean.mockReturnValue(undefined);
            sessionDomain.getListOffsetByAdmin.mockResolvedValue(offsetPage);

            await service.getListOffsetByAdmin('user-id', {});

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...offsetStorePatch, filters: {} }
            );
            expect(sessionDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-id',
                offsetParams,
                undefined,
                scopeWhere
            );
        });

        it('propagates PolicyForbiddenException and skips the domain when the ability has no read rule', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.getListOffsetByAdmin('user-id', {})
            ).rejects.toThrow(PolicyForbiddenException);
            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(sessionDomain.getListOffsetByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.getListOffsetByAdmin('user-id', {})
            ).rejects.toThrow(RequestContextMissingException);
            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(sessionDomain.getListOffsetByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('getListCursor', () => {
        it('delegates the cursor list to the domain without a policy predicate', async () => {
            const query = {};
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            sessionDomain.getListCursor.mockResolvedValue(cursorPage);

            const result = await service.getListCursor('user-id', query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: SessionCursorAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                cursorStorePatch
            );
            expect(sessionDomain.getListCursor).toHaveBeenCalledWith(
                'user-id',
                cursorParams
            );
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(result).toEqual(cursorPage);
        });
    });

    describe('revoke', () => {
        it('delegates to the domain', async () => {
            sessionDomain.revoke.mockResolvedValue(undefined);

            await expect(
                service.revoke('user-id', 'session-id')
            ).resolves.toBeUndefined();
            expect(sessionDomain.revoke).toHaveBeenCalledWith(
                'user-id',
                'session-id'
            );
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
        });
    });

    describe('revokeByAdmin', () => {
        it('loads the active session, authorizes delete, and revokes by id', async () => {
            sessionDomain.revokeByAdmin.mockResolvedValue(undefined);

            await expect(
                service.revokeByAdmin('user-id', 'session-id', 'admin-id')
            ).resolves.toEqual({});
            expect(sessionDomain.validateActive).toHaveBeenCalledWith(
                'user-id',
                'session-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.delete,
                subject(EnumPolicySubject.Session, session)
            );
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(sessionDomain.revokeByAdmin).toHaveBeenCalledWith(
                'user-id',
                'session-id',
                'admin-id'
            );
        });

        it('throws PolicyForbiddenException and never revokes when the ability has no delete rule', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.revokeByAdmin('user-id', 'session-id', 'admin-id')
            ).rejects.toThrow(PolicyForbiddenException);
            expect(sessionDomain.validateActive).toHaveBeenCalledWith(
                'user-id',
                'session-id'
            );
            expect(sessionDomain.revokeByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.revokeByAdmin('user-id', 'session-id', 'admin-id')
            ).rejects.toThrow(RequestContextMissingException);
            expect(sessionDomain.validateActive).toHaveBeenCalledWith(
                'user-id',
                'session-id'
            );
            expect(sessionDomain.revokeByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('revokeAllByAdmin', () => {
        it('loads the user, authorizes update, and revokes every active session', async () => {
            sessionDomain.revokeAllByAdmin.mockResolvedValue(undefined);

            await expect(
                service.revokeAllByAdmin('user-id', 'admin-id')
            ).resolves.toEqual({});
            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.User, storedUser)
            );
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(sessionDomain.revokeAllByAdmin).toHaveBeenCalledWith(
                'user-id',
                'admin-id'
            );
        });

        it('excluded user: UserNotFoundException propagates and the revoke is not called', async () => {
            userDomain.getOne.mockRejectedValue(new UserNotFoundException());

            await expect(
                service.revokeAllByAdmin('user-id', 'admin-id')
            ).rejects.toBeInstanceOf(UserNotFoundException);
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(sessionDomain.revokeAllByAdmin).not.toHaveBeenCalled();
        });

        it('readable user with zero active sessions: SessionNotFoundException propagates, not UserNotFoundException', async () => {
            userDomain.getOne.mockResolvedValue(storedUser);
            sessionDomain.revokeAllByAdmin.mockRejectedValue(
                new SessionNotFoundException()
            );

            await expect(
                service.revokeAllByAdmin('user-id', 'admin-id')
            ).rejects.toBeInstanceOf(SessionNotFoundException);
        });

        it('throws PolicyForbiddenException and never revokes when the ability has no update rule', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.revokeAllByAdmin('user-id', 'admin-id')
            ).rejects.toThrow(PolicyForbiddenException);
            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(sessionDomain.revokeAllByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.revokeAllByAdmin('user-id', 'admin-id')
            ).rejects.toThrow(RequestContextMissingException);
            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(sessionDomain.revokeAllByAdmin).not.toHaveBeenCalled();
        });
    });
});

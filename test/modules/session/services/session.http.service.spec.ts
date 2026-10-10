import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { detectSubjectType } from '@casl/ability';

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
import { SessionHttpService } from '@modules/session/services/session.http.service';
import { UserDomain } from '@modules/user/domains/user.domain';
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
    const accessibleWhere = { userId: 'user-id' };
    const item = mock<ISessionList>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const userRef = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        photo: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };
    const storedSession = {
        id: 'session-id',
        userId: 'user-id',
        deviceOwnershipId: 'ownership-id',
        jti: 'jti',
        ipAddress: null,
        userAgent: {},
        geoLocation: null,
        expiredAt: now,
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        user: userRef,
        revokedBy: null,
    } satisfies ISession;
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
        policyAbilityDomain.accessibleWhere.mockReturnValue(accessibleWhere);
        userDomain.getOne.mockResolvedValue(storedUser);

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

            expect(userDomain.getOne).not.toHaveBeenCalled();
            expect(policyAbilityDomain.assertCan).not.toHaveBeenCalled();
            expect(policyAbilityDomain.accessibleWhere).toHaveBeenCalledWith(
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
                accessibleWhere
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
                accessibleWhere
            );
        });

        it('propagates PolicyForbiddenException and skips the domain when the ability has no read rule', async () => {
            policyAbilityDomain.accessibleWhere.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.getListOffsetByAdmin('user-id', {})
            ).rejects.toThrow(PolicyForbiddenException);
            expect(sessionDomain.getListOffsetByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.accessibleWhere.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.getListOffsetByAdmin('user-id', {})
            ).rejects.toThrow(RequestContextMissingException);
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
            expect(policyAbilityDomain.accessibleWhere).not.toHaveBeenCalled();
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
        });
    });

    describe('revokeByAdmin', () => {
        it('checks delete on the active session of the route user, delegates to the domain and answers an empty envelope', async () => {
            sessionDomain.validateActive.mockResolvedValue(storedSession);
            sessionDomain.revokeByAdmin.mockResolvedValue(undefined);

            await expect(
                service.revokeByAdmin('user-id', 'session-id', 'admin-id')
            ).resolves.toEqual({});
            expect(sessionDomain.validateActive).toHaveBeenCalledWith(
                'user-id',
                'session-id'
            );
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledTimes(1);
            const [action, record] =
                policyAbilityDomain.assertCan.mock.calls[0];
            expect(action).toBe(EnumPolicyAction.delete);
            expect(record).toBe(storedSession);
            expect(detectSubjectType(record as never)).toBe(
                EnumPolicySubject.Session
            );
            expect(sessionDomain.revokeByAdmin).toHaveBeenCalledWith(
                'user-id',
                'session-id',
                'admin-id'
            );
        });

        it('throws PolicyForbiddenException and never revokes when the record is denied', async () => {
            sessionDomain.validateActive.mockResolvedValue(storedSession);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.revokeByAdmin('user-id', 'session-id', 'admin-id')
            ).rejects.toThrow(PolicyForbiddenException);
            expect(sessionDomain.revokeByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.revokeByAdmin('user-id', 'session-id', 'admin-id')
            ).rejects.toThrow(RequestContextMissingException);
            expect(sessionDomain.revokeByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('revokeAllByAdmin', () => {
        it('checks update on the target user, delegates to the domain and answers an empty envelope', async () => {
            userDomain.getOne.mockResolvedValue(storedUser);
            sessionDomain.revokeAllByAdmin.mockResolvedValue(undefined);

            await expect(
                service.revokeAllByAdmin('user-id', 'admin-id')
            ).resolves.toEqual({});
            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledTimes(1);
            const [action, record] =
                policyAbilityDomain.assertCan.mock.calls[0];
            expect(action).toBe(EnumPolicyAction.update);
            expect(record).toBe(storedUser);
            expect(detectSubjectType(record as never)).toBe(
                EnumPolicySubject.User
            );
            expect(sessionDomain.revokeAllByAdmin).toHaveBeenCalledWith(
                'user-id',
                'admin-id'
            );
        });

        it('throws PolicyForbiddenException and never revokes when the user is denied', async () => {
            userDomain.getOne.mockResolvedValue(storedUser);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.revokeAllByAdmin('user-id', 'admin-id')
            ).rejects.toThrow(PolicyForbiddenException);
            expect(sessionDomain.revokeAllByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.revokeAllByAdmin('user-id', 'admin-id')
            ).rejects.toThrow(RequestContextMissingException);
            expect(sessionDomain.revokeAllByAdmin).not.toHaveBeenCalled();
        });
    });
});

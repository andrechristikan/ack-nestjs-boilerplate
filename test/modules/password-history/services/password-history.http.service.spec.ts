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
} from '@generated/prisma-client/client';
import {
    PasswordHistoryCursorAvailableOrderBy,
    PasswordHistoryDefaultAvailableOrderBy,
} from '@modules/password-history/constants/password-history.list.constant';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import type { IPasswordHistoryList } from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryHttpService } from '@modules/password-history/services/password-history.http.service';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import type { IUserProfile } from '@modules/user/interfaces/user.interface';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';

describe('PasswordHistoryHttpService', () => {
    const passwordHistoryDomain: MockProxy<PasswordHistoryDomain> =
        mock<PasswordHistoryDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const scopeWhere = { userId: 'user-id' };
    const user = mock<IUserProfile>();
    const item = mock<IPasswordHistoryList>();
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

    let service: PasswordHistoryHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityDomain.scope.mockReturnValue(scopeWhere);
        userDomain.getOne.mockResolvedValue(user);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PasswordHistoryHttpService,
                {
                    provide: PasswordHistoryDomain,
                    useValue: passwordHistoryDomain,
                },
                { provide: UserDomain, useValue: userDomain },
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = module.get(PasswordHistoryHttpService);
    });

    describe('getListOffsetByAdmin', () => {
        it('loads the parent user, authorizes read, then lists under the PasswordHistory scope', async () => {
            const callOrder: string[] = [];
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            userDomain.getOne.mockImplementation(async () => {
                callOrder.push('parent');
                return user;
            });
            policyAbilityDomain.authorize.mockImplementation(() => {
                callOrder.push('authorize');
            });
            passwordHistoryDomain.getListOffsetByAdmin.mockImplementation(
                async () => {
                    callOrder.push('list');
                    return offsetPage;
                }
            );

            await service.getListOffsetByAdmin('user-id', {});

            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.User, user)
            );
            expect(policyAbilityDomain.scope).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.PasswordHistory
            );
            expect(
                passwordHistoryDomain.getListOffsetByAdmin
            ).toHaveBeenCalledWith('user-id', offsetParams, scopeWhere);
            expect(callOrder).toEqual(['parent', 'authorize', 'list']);
        });

        it('throws UserNotFoundException and never lists when the parent lookup misses', async () => {
            userDomain.getOne.mockRejectedValue(new UserNotFoundException());

            await expect(
                service.getListOffsetByAdmin('user-id', {})
            ).rejects.toThrow(UserNotFoundException);
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(
                passwordHistoryDomain.getListOffsetByAdmin
            ).not.toHaveBeenCalled();
        });

        it('passes the read predicate of PasswordHistory to the domain list and shapes the page', async () => {
            const query = {};
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            passwordHistoryDomain.getListOffsetByAdmin.mockResolvedValue(
                offsetPage
            );

            const result = await service.getListOffsetByAdmin('user-id', query);

            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.User, user)
            );
            expect(policyAbilityDomain.scope).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.PasswordHistory
            );
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: PasswordHistoryDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                offsetStorePatch
            );
            expect(
                passwordHistoryDomain.getListOffsetByAdmin
            ).toHaveBeenCalledWith('user-id', offsetParams, scopeWhere);
            expect(result).toEqual(offsetPage);
        });

        it('propagates PolicyForbiddenException and skips the domain when the ability has no read rule', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.getListOffsetByAdmin('user-id', {})
            ).rejects.toThrow(PolicyForbiddenException);
            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(
                passwordHistoryDomain.getListOffsetByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.getListOffsetByAdmin('user-id', {})
            ).rejects.toThrow(RequestContextMissingException);
            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(
                passwordHistoryDomain.getListOffsetByAdmin
            ).not.toHaveBeenCalled();
        });
    });

    describe('getListCursor', () => {
        it('delegates the cursor list to the domain without a policy predicate', async () => {
            const query = {};
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            passwordHistoryDomain.getListCursor.mockResolvedValue(cursorPage);

            const result = await service.getListCursor('user-id', query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: PasswordHistoryCursorAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                cursorStorePatch
            );
            expect(passwordHistoryDomain.getListCursor).toHaveBeenCalledWith(
                'user-id',
                cursorParams
            );
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(result).toEqual(cursorPage);
        });
    });
});

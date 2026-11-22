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
import type { Workspace } from '@generated/prisma-client/client';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLog } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogHttpService } from '@modules/activity-log/services/activity-log.http.service';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import type { IUserProfile } from '@modules/user/interfaces/user.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';

describe('ActivityLogHttpService', () => {
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const scopeWhere = { userId: 'user-id' };
    const user = mock<IUserProfile>();
    const workspace = mock<Workspace>();
    const log = mock<IActivityLog>();
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
        data: [log],
    };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        count: 1,
        perPage: 20,
        hasNext: false,
        cursor: undefined,
        data: [log],
    };

    let service: ActivityLogHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityDomain.scope.mockReturnValue(scopeWhere);
        userDomain.getOne.mockResolvedValue(user);
        workspaceDomain.getByIdForAdmin.mockResolvedValue(workspace);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogHttpService,
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: UserDomain, useValue: userDomain },
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = module.get(ActivityLogHttpService);
    });

    describe('getListOffset', () => {
        it('scopes ActivityLog and does not load a parent when neither id is set', async () => {
            const query = {};
            const scope = { userId: '', workspaceId: '' };
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            activityLogDomain.getListOffset.mockResolvedValue(offsetPage);

            const result = await service.getListOffset(scope, query);

            expect(userDomain.getOne).not.toHaveBeenCalled();
            expect(workspaceDomain.getByIdForAdmin).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(policyAbilityDomain.scope).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.ActivityLog
            );
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: ActivityLogDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                offsetStorePatch
            );
            expect(activityLogDomain.getListOffset).toHaveBeenCalledWith(
                scope,
                offsetParams,
                scopeWhere
            );
            expect(result).toEqual(offsetPage);
        });

        it('user scope: loads the user, authorizes read, then lists under the ActivityLog scope', async () => {
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
            activityLogDomain.getListOffset.mockImplementation(async () => {
                callOrder.push('list');
                return offsetPage;
            });

            await service.getListOffset({ userId: 'user-id' }, {});

            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.User, user)
            );
            expect(policyAbilityDomain.scope).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.ActivityLog
            );
            expect(workspaceDomain.getByIdForAdmin).not.toHaveBeenCalled();
            expect(activityLogDomain.getListOffset).toHaveBeenCalledWith(
                { userId: 'user-id' },
                offsetParams,
                scopeWhere
            );
            expect(callOrder).toEqual(['parent', 'authorize', 'list']);
        });

        it('workspace scope: loads the workspace, authorizes read, then lists under the ActivityLog scope', async () => {
            const callOrder: string[] = [];
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            workspaceDomain.getByIdForAdmin.mockImplementation(async () => {
                callOrder.push('parent');
                return workspace;
            });
            policyAbilityDomain.authorize.mockImplementation(() => {
                callOrder.push('authorize');
            });
            activityLogDomain.getListOffset.mockImplementation(async () => {
                callOrder.push('list');
                return offsetPage;
            });

            await service.getListOffset(
                { workspaceId: 'workspace-id', userId: 'user-id' },
                {}
            );

            expect(workspaceDomain.getByIdForAdmin).toHaveBeenCalledWith(
                'workspace-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.Workspace, workspace)
            );
            expect(policyAbilityDomain.scope).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.ActivityLog
            );
            expect(userDomain.getOne).not.toHaveBeenCalled();
            expect(activityLogDomain.getListOffset).toHaveBeenCalledWith(
                { workspaceId: 'workspace-id', userId: 'user-id' },
                offsetParams,
                scopeWhere
            );
            expect(callOrder).toEqual(['parent', 'authorize', 'list']);
        });

        it('parent miss: throws the user 404 and never lists', async () => {
            userDomain.getOne.mockRejectedValue(new UserNotFoundException());

            await expect(
                service.getListOffset({ userId: 'user-id' }, {})
            ).rejects.toThrow(UserNotFoundException);
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(activityLogDomain.getListOffset).not.toHaveBeenCalled();
        });

        it('parent miss: throws the workspace 404 and never lists', async () => {
            workspaceDomain.getByIdForAdmin.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                service.getListOffset({ workspaceId: 'workspace-id' }, {})
            ).rejects.toThrow(WorkspaceNotFoundException);
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(activityLogDomain.getListOffset).not.toHaveBeenCalled();
        });

        it('propagates PolicyForbiddenException and skips the domain when the ability has no read rule', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.getListOffset({ userId: 'user-id' }, {})
            ).rejects.toThrow(PolicyForbiddenException);
            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(activityLogDomain.getListOffset).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and skips the domain when no ability is stored', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.getListOffset({ userId: 'user-id' }, {})
            ).rejects.toThrow(RequestContextMissingException);
            expect(userDomain.getOne).toHaveBeenCalledWith('user-id');
            expect(activityLogDomain.getListOffset).not.toHaveBeenCalled();
        });
    });

    describe('getListCursor', () => {
        it('delegates the cursor list to the domain without a policy predicate', async () => {
            const query = {};
            const scope = { userId: 'user-id' };
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            activityLogDomain.getListCursor.mockResolvedValue(cursorPage);

            const result = await service.getListCursor(scope, query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: ActivityLogDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                cursorStorePatch
            );
            expect(activityLogDomain.getListCursor).toHaveBeenCalledWith(
                scope,
                cursorParams
            );
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(result).toEqual(cursorPage);
        });
    });
});

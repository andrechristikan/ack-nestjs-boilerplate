import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import { EnumWorkspaceInviteOrderBy } from '@modules/workspace/enums/workspace.enum';

import {
    WorkspaceInviteOrderBy,
    WorkspaceInviteDefaultAvailableSearch,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceInviteListRequestDto } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import type { IWorkspaceInviteList } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { WorkspaceGetInvitesListUseCase } from '@modules/workspace/use-cases/workspace.get-invites-list.use-case';
import {
    buildWorkspace,
    buildWorkspaceMember,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('WorkspaceGetInvitesListUseCase', () => {
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const cursorPagination: IPaginationQueryCursorParams = {
        fingerprint: '04cd2d1615fab8bd',
        limit: 20,
        orderBy: [{ createdAt: EnumPaginationOrderDirectionType.desc }],
    };
    const workspaceContext = buildWorkspaceContext(
        buildWorkspace(),
        buildWorkspaceMember('user-1')
    );
    let useCase: WorkspaceGetInvitesListUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGetInvitesListUseCase,
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                WorkspaceUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(WorkspaceGetInvitesListUseCase);
    });

    describe('execute', () => {
        it('returns each invite of the page with its email censored', async () => {
            const invite: IWorkspaceInviteList = {
                id: 'invite-1',
                workspaceId: 'workspace-1',
                email: 'invitee@example.com',
                workspaceRole: EnumWorkspaceMemberRole.member,
                projectId: null,
                projectRole: null,
                reference: 'REF123',
                expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                status: EnumWorkspaceInviteStatus.pending,
                invitedByUserId: 'user-1',
                acceptedAt: null,
                acceptedByUserId: null,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: 'user-1',
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: null,
            };
            const page: IResponsePaginationReturn<IWorkspaceInviteList> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [invite],
            };
            workspaceInviteService.getInvitesList.mockResolvedValue(page);

            await expect(
                useCase.execute(workspaceContext, {})
            ).resolves.toEqual({
                ...page,
                data: [{ ...invite, email: 'invi*ee@e**********' }],
            });
        });

        it('parses the cursor query, merges the status filter, and returns the page', async () => {
            const query: WorkspaceInviteListRequestDto = {
                status: 'pending',
            };
            const page: IResponsePaginationReturn<IWorkspaceInviteList> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceInviteService.getInvitesList.mockResolvedValue(page);

            await useCase.execute(workspaceContext, query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    perPage: 20,
                    orderBy: EnumWorkspaceInviteOrderBy.latest,
                    availableSearch: WorkspaceInviteDefaultAvailableSearch,
                    availableOrderBy: Object.keys(WorkspaceInviteOrderBy),
                    filters: { status: [EnumWorkspaceInviteStatus.pending] },
                }
            );
            expect(workspaceInviteService.getInvitesList).toHaveBeenCalledWith(
                'workspace-1',
                cursorPagination,
                { status: { in: [EnumWorkspaceInviteStatus.pending] } }
            );
        });

        it('merges an empty filter set when status is absent', async () => {
            const page: IResponsePaginationReturn<IWorkspaceInviteList> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            workspaceInviteService.getInvitesList.mockResolvedValue(page);

            await useCase.execute(workspaceContext, {});

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    perPage: 20,
                    orderBy: EnumWorkspaceInviteOrderBy.latest,
                    availableSearch: WorkspaceInviteDefaultAvailableSearch,
                    availableOrderBy: Object.keys(WorkspaceInviteOrderBy),
                    filters: {},
                }
            );
        });
    });
});

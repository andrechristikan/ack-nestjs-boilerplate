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
import type { Workspace } from '@generated/prisma-client/client';
import {
    WorkspaceCursorOrderBy,
    WorkspaceDefaultAvailableSearch,
} from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceUserListRequestDto } from '@modules/workspace/dtos/request/workspace.user-list.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceGetListCursorByMemberUseCase } from '@modules/workspace/use-cases/workspace.get-list-cursor-by-member.use-case';
import {
    buildAuthJwtAccessContext,
    buildUser,
    buildUserContext,
    buildWorkspace,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumWorkspaceCursorOrderBy } from '@modules/workspace/enums/workspace.enum';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('WorkspaceGetListCursorByMemberUseCase', () => {
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const workspace: Workspace = buildWorkspace();
    const cursorPagination: IPaginationQueryCursorParams = {
        fingerprint: '2548462ecb177b83',
        limit: 20,
        orderBy: [{ createdAt: EnumPaginationOrderDirectionType.desc }],
    };
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    let useCase: WorkspaceGetListCursorByMemberUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGetListCursorByMemberUseCase,
                { provide: WorkspaceService, useValue: workspaceService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(WorkspaceGetListCursorByMemberUseCase);
    });

    describe('execute', () => {
        it('parses the cursor query, merges the store patch, and returns the page', async () => {
            const query: WorkspaceUserListRequestDto = {};
            const page: IResponsePaginationReturn<Workspace> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [workspace],
            };
            workspaceService.getListCursorByMember.mockResolvedValue(page);

            const result = await useCase.execute(authContext, query);

            expect(result).toEqual(page);
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    perPage: 20,
                    orderBy: EnumWorkspaceCursorOrderBy.latest,
                    availableSearch: WorkspaceDefaultAvailableSearch,
                    availableOrderBy: Object.keys(WorkspaceCursorOrderBy),
                }
            );
            expect(workspaceService.getListCursorByMember).toHaveBeenCalledWith(
                'user-1',
                cursorPagination
            );
        });
    });
});

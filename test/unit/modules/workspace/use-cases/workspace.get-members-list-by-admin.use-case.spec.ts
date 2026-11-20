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
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { WorkspaceMemberOrderBy } from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceGetMembersListByAdminUseCase } from '@modules/workspace/use-cases/workspace.get-members-list-by-admin.use-case';
import { EnumWorkspaceMemberOrderBy } from '@modules/workspace/enums/workspace.enum';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('WorkspaceGetMembersListByAdminUseCase', () => {
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const offsetPagination: IPaginationQueryOffsetParams = {
        skip: 0,
        limit: 20,
        orderBy: [{ createdAt: EnumPaginationOrderDirectionType.desc }],
    };
    let useCase: WorkspaceGetMembersListByAdminUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGetMembersListByAdminUseCase,
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(WorkspaceGetMembersListByAdminUseCase);
    });

    describe('execute', () => {
        it('parses the offset query, merges the store patch, and returns the page', async () => {
            const query: WorkspaceAdminMemberListRequestDto = {};
            const page: IResponsePaginationReturn<IWorkspaceMember> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            workspaceMemberService.getMembersListByAdmin.mockResolvedValue(
                page
            );

            await useCase.execute('workspace-1', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    page: 1,
                    perPage: 20,
                    orderBy: EnumWorkspaceMemberOrderBy.latest,
                    availableSearch: [],
                    availableOrderBy: Object.keys(WorkspaceMemberOrderBy),
                }
            );
            expect(
                workspaceMemberService.getMembersListByAdmin
            ).toHaveBeenCalledWith('workspace-1', offsetPagination);
        });
    });
});

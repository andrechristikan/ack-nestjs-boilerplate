import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumUserStatus } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { UserService } from '@modules/user/services/user.service';
import type { UserListRequestDto } from '@modules/user/dtos/request/user.list.request.dto';
import type { IUserList } from '@modules/user/interfaces/user.interface';
import {
    UserDefaultAvailableOrderBy,
    UserDefaultAvailableSearch,
} from '@modules/user/constants/user.list.constant';
import { UserGetListOffsetByAdminUseCase } from '@modules/user/use-cases/user.get-list-offset-by-admin.use-case';

describe('UserGetListOffsetByAdminUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const paginationFilterUtil: MockProxy<PaginationFilterUtil> =
        mock<PaginationFilterUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let useCase: UserGetListOffsetByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserGetListOffsetByAdminUseCase,
                { provide: UserService, useValue: userService },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: PaginationFilterUtil,
                    useValue: paginationFilterUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        useCase = module.get(UserGetListOffsetByAdminUseCase);
    });

    describe('execute', () => {
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
            paginationFilterUtil.inEnum.mockReturnValue({
                where: { status: { in: [EnumUserStatus.active] } },
                storeFilter: { status: [EnumUserStatus.active] },
            });
            paginationFilterUtil.equalString
                .mockReturnValueOnce({
                    where: { roleId: { equals: 'role-cinder' } },
                    storeFilter: { roleId: 'role-cinder' },
                })
                .mockReturnValueOnce({
                    where: { countryId: { equals: 'country-cinder' } },
                    storeFilter: { countryId: 'country-cinder' },
                });
            userService.getListOffsetByAdmin.mockResolvedValue(response);

            await expect(useCase.execute(query)).resolves.toBe(response);
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
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableSearch: UserDefaultAvailableSearch,
                availableOrderBy: UserDefaultAvailableOrderBy,
            });
            expect(userService.getListOffsetByAdmin).toHaveBeenCalledWith(
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
            paginationFilterUtil.inEnum.mockReturnValue(null);
            paginationFilterUtil.equalString.mockReturnValue(null);
            userService.getListOffsetByAdmin.mockResolvedValue(response);

            await useCase.execute(query);

            expect(userService.getListOffsetByAdmin).toHaveBeenCalledWith(
                params,
                undefined,
                undefined,
                undefined
            );
        });
    });
});

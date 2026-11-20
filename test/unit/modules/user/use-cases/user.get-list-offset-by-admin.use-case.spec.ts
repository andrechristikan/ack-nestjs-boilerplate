import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumUserStatus } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { UserService } from '@modules/user/services/user.service';
import type { UserListRequestDto } from '@modules/user/dtos/request/user.list.request.dto';
import type { IUserList } from '@modules/user/interfaces/user.interface';
import { UserGetListOffsetByAdminUseCase } from '@modules/user/use-cases/user.get-list-offset-by-admin.use-case';

describe('UserGetListOffsetByAdminUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let useCase: UserGetListOffsetByAdminUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserGetListOffsetByAdminUseCase,
                { provide: UserService, useValue: userService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
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
        const params = {
            skip: 0,
            limit: 20,
            orderBy: [{ createdAt: 'desc' }],
        };

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
            userService.getListOffsetByAdmin.mockResolvedValue(response);

            await expect(
                useCase.execute({
                    ...query,
                    status: EnumUserStatus.active,
                    roleId: 'role-cinder',
                    countryId: 'country-cinder',
                })
            ).resolves.toBe(response);
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
            expect(userService.getListOffsetByAdmin).toHaveBeenCalledWith(
                params,
                { status: { in: [EnumUserStatus.active] } },
                { roleId: { equals: 'role-cinder' } },
                { countryId: { equals: 'country-cinder' } }
            );
        });

        it('calls the domain with undefined wheres when no filter applies', async () => {
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

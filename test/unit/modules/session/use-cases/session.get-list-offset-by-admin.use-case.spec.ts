import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { SessionAdminListRequestDto } from '@modules/session/dtos/request/session.admin-list.request.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionService } from '@modules/session/services/session.service';
import { SessionGetListOffsetByAdminUseCase } from '@modules/session/use-cases/session.get-list-offset-by-admin.use-case';

describe('SessionGetListOffsetByAdminUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let useCase: SessionGetListOffsetByAdminUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionGetListOffsetByAdminUseCase,
                { provide: SessionService, useValue: sessionService },
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
        useCase = module.get(SessionGetListOffsetByAdminUseCase);
    });

    describe('execute', () => {
        it('merges no revoked filter into the store when the query carries none', async () => {
            const query: SessionAdminListRequestDto = {};
            const params = {
                limit: 20,
                skip: 0,
                orderBy: [{ createdAt: 'desc' }],
            };
            const storePatch = {
                page: 1,
                perPage: 20,
                orderBy: 'latest',
                availableSearch: [],
                availableOrderBy: ['latest', 'recentlyUpdated'],
            };
            const paginationResult: IResponsePaginationReturn<ISessionList> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 0,
                data: [],
            };
            sessionService.getListOffsetByAdmin.mockResolvedValue(
                paginationResult
            );

            const result = await useCase.execute('user-1', query);

            expect(result).toEqual({
                data: [],
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 0,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...storePatch, filters: {} }
            );
            expect(sessionService.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-1',
                params,
                undefined
            );
        });

        it('merges the revoked filter into the store when the query carries one', async () => {
            const query: SessionAdminListRequestDto = { isRevoked: true };
            const params = {
                limit: 20,
                skip: 0,
                orderBy: [{ createdAt: 'desc' }],
            };
            const storePatch = {
                page: 1,
                perPage: 20,
                orderBy: 'latest',
                availableSearch: [],
                availableOrderBy: ['latest', 'recentlyUpdated'],
            };
            sessionService.getListOffsetByAdmin.mockResolvedValue({
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 0,
                data: [],
            });

            await useCase.execute('user-1', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...storePatch, filters: { isRevoked: true } }
            );
            expect(sessionService.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-1',
                params,
                { isRevoked: { equals: true } }
            );
        });
    });
});

import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { Prisma } from '@generated/prisma-client/client';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IPaginationQueryFilterResult } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    SessionCursorAvailableOrderBy,
    SessionDefaultAvailableOrderBy,
} from '@modules/session/constants/session.list.constant';
import type { SessionAdminListRequestDto } from '@modules/session/dtos/request/session.admin-list.request.dto';
import type { SessionSharedListRequestDto } from '@modules/session/dtos/request/session.shared-list.request.dto';
import type { ISessionList } from '@modules/session/interfaces/session.interface';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionHttpService } from '@modules/session/services/session.http.service';

describe('SessionHttpService', () => {
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let service: SessionHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionHttpService,
                { provide: SessionDomain, useValue: sessionDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        service = module.get(SessionHttpService);
    });

    describe('getListOffsetByAdmin', () => {
        it('merges no revoked filter into the store when the query carries none', async () => {
            const query: SessionAdminListRequestDto = {};
            const params = { limit: 20, skip: 0, orderBy: [] };
            const storePatch = {
                page: 1,
                perPage: 20,
                availableSearch: [],
                availableOrderBy: SessionDefaultAvailableOrderBy,
            };
            paginationQueryUtil.offset.mockReturnValue({ params, storePatch });
            paginationQueryUtil.equalBoolean.mockReturnValue(null);
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
            sessionDomain.getListOffsetByAdmin.mockResolvedValue(
                paginationResult
            );

            const result = await service.getListOffsetByAdmin('user-1', query);

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
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: SessionDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.equalBoolean).toHaveBeenCalledWith(
                Prisma.SessionScalarFieldEnum.isRevoked,
                undefined
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...storePatch, filters: {} }
            );
            expect(sessionDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-1',
                params,
                undefined
            );
        });

        it('merges the revoked filter into the store when the query carries one', async () => {
            const query: SessionAdminListRequestDto = { isRevoked: true };
            const params = { limit: 20, skip: 0, orderBy: [] };
            const storePatch = { page: 1, perPage: 20 };
            paginationQueryUtil.offset.mockReturnValue({ params, storePatch });
            const isRevokedResult: IPaginationQueryFilterResult<{
                isRevoked: { equals: boolean };
            }> = {
                where: { isRevoked: { equals: true } },
                storeFilter: { isRevoked: true },
            };
            paginationQueryUtil.equalBoolean.mockReturnValue(isRevokedResult);
            sessionDomain.getListOffsetByAdmin.mockResolvedValue({
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 0,
                data: [],
            });

            await service.getListOffsetByAdmin('user-1', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...storePatch, filters: { isRevoked: true } }
            );
            expect(sessionDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                'user-1',
                params,
                { isRevoked: { equals: true } }
            );
        });
    });

    describe('getListCursor', () => {
        it('delegates to the domain with the cursor pagination params', async () => {
            const query: SessionSharedListRequestDto = {};
            const params = { limit: 20, orderBy: [] };
            const storePatch = { perPage: 20 };
            paginationQueryUtil.cursor.mockReturnValue({ params, storePatch });
            const paginationResult: IResponsePaginationReturn<ISessionList> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            sessionDomain.getListCursor.mockResolvedValue(paginationResult);

            const result = await service.getListCursor('user-1', query);

            expect(result).toEqual({
                data: [],
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
            });
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: SessionCursorAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(sessionDomain.getListCursor).toHaveBeenCalledWith(
                'user-1',
                params
            );
        });
    });

    describe('revoke', () => {
        it('delegates to the domain and returns an empty response', async () => {
            const result = await service.revoke('user-1', 'session-1');

            expect(result).toEqual({});
            expect(sessionDomain.revoke).toHaveBeenCalledWith(
                'user-1',
                'session-1'
            );
        });
    });

    describe('revokeByAdmin', () => {
        it('delegates to the domain and returns an empty response', async () => {
            const result = await service.revokeByAdmin(
                'user-1',
                'session-1',
                'admin-1'
            );

            expect(result).toEqual({});
            expect(sessionDomain.revokeByAdmin).toHaveBeenCalledWith(
                'user-1',
                'session-1',
                'admin-1'
            );
        });
    });

    describe('revokeAllByAdmin', () => {
        it('delegates to the domain and returns an empty response', async () => {
            const result = await service.revokeAllByAdmin('user-1', 'admin-1');

            expect(result).toEqual({});
            expect(sessionDomain.revokeAllByAdmin).toHaveBeenCalledWith(
                'user-1',
                'admin-1'
            );
        });
    });
});

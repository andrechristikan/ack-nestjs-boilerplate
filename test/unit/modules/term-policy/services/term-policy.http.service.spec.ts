import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    Prisma,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import {
    TermPolicyDefaultAvailableOrderBy,
    TermPolicyDefaultStatus,
    TermPolicyDefaultType,
} from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import { TermPolicyHttpService } from '@modules/term-policy/services/term-policy.http.service';
import type { TermPolicyAdminListRequestDto } from '@modules/term-policy/dtos/request/term-policy.admin-list.request.dto';
import type { TermPolicyPublicListRequestDto } from '@modules/term-policy/dtos/request/term-policy.public-list.request.dto';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';

describe('TermPolicyHttpService', () => {
    const termPolicyDomain: MockProxy<TermPolicyDomain> =
        mock<TermPolicyDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [] as TermPolicy[],
    };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [] as TermPolicy[],
    };
    const offsetParams = { skip: 0, limit: 20, orderBy: [] };
    const cursorParams = { limit: 20, orderBy: [] };
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const termPolicy: TermPolicy = {
        id: 'term-policy-1',
        type: EnumTermPolicyType.privacy,
        contents: [],
        version: 1,
        status: EnumTermPolicyStatus.draft,
        publishedAt: null,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
    };

    let service: TermPolicyHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyHttpService,
                { provide: TermPolicyDomain, useValue: termPolicyDomain },
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

        service = module.get(TermPolicyHttpService);
    });

    describe('getListByAdmin', () => {
        const query: TermPolicyAdminListRequestDto = { page: 1, perPage: 20 };

        it('merges type and status filters into the pagination store and returns the domain page', async () => {
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: { filters: { existing: true } },
            });
            paginationQueryUtil.inEnum
                .mockReturnValueOnce({
                    where: { type: { in: TermPolicyDefaultType } },
                    storeFilter: { type: 'privacy' },
                })
                .mockReturnValueOnce({
                    where: { status: { in: TermPolicyDefaultStatus } },
                    storeFilter: { status: 'draft' },
                });
            termPolicyDomain.getListByAdmin.mockResolvedValue(offsetPage);

            const result = await service.getListByAdmin(query);

            expect(result).toEqual(offsetPage);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: TermPolicyDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.inEnum).toHaveBeenNthCalledWith(
                1,
                Prisma.TermPolicyScalarFieldEnum.type,
                query.type,
                TermPolicyDefaultType
            );
            expect(paginationQueryUtil.inEnum).toHaveBeenNthCalledWith(
                2,
                Prisma.TermPolicyScalarFieldEnum.status,
                query.status,
                TermPolicyDefaultStatus
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    filters: {
                        existing: true,
                        type: 'privacy',
                        status: 'draft',
                    },
                }
            );
            expect(termPolicyDomain.getListByAdmin).toHaveBeenCalledWith(
                offsetParams,
                { type: { in: TermPolicyDefaultType } },
                { status: { in: TermPolicyDefaultStatus } }
            );
        });

        it('merges no extra filter when type and status resolve to undefined', async () => {
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: {},
            });
            paginationQueryUtil.inEnum.mockReturnValue(null);
            termPolicyDomain.getListByAdmin.mockResolvedValue(offsetPage);

            await service.getListByAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(termPolicyDomain.getListByAdmin).toHaveBeenCalledWith(
                offsetParams,
                undefined,
                undefined
            );
        });
    });

    describe('getListPublished', () => {
        const query: TermPolicyPublicListRequestDto = { perPage: 20 };

        it('merges the type filter into the pagination store and returns the domain page', async () => {
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: { filters: { existing: true } },
            });
            paginationQueryUtil.inEnum.mockReturnValue({
                where: { type: { in: TermPolicyDefaultType } },
                storeFilter: { type: 'privacy' },
            });
            termPolicyDomain.getListPublished.mockResolvedValue(cursorPage);

            const result = await service.getListPublished(query);

            expect(result).toEqual(cursorPage);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: TermPolicyDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
                Prisma.TermPolicyScalarFieldEnum.type,
                query.type,
                TermPolicyDefaultType
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { existing: true, type: 'privacy' } }
            );
            expect(termPolicyDomain.getListPublished).toHaveBeenCalledWith(
                cursorParams,
                { type: { in: TermPolicyDefaultType } }
            );
        });

        it('merges no extra filter when type resolves to undefined', async () => {
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: {},
            });
            paginationQueryUtil.inEnum.mockReturnValue(null);
            termPolicyDomain.getListPublished.mockResolvedValue(cursorPage);

            await service.getListPublished(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(termPolicyDomain.getListPublished).toHaveBeenCalledWith(
                cursorParams,
                undefined
            );
        });
    });

    describe('createByAdmin', () => {
        it('wraps the created term policy in the response envelope', async () => {
            const body: TermPolicyCreateRequestDto = {
                type: TermPolicyDefaultType[0],
                version: 1,
                contents: [],
            };
            const created: TermPolicy = termPolicy;
            termPolicyDomain.createByAdmin.mockResolvedValue(created);

            const result = await service.createByAdmin(body);

            expect(result).toEqual({ data: created });
            expect(termPolicyDomain.createByAdmin).toHaveBeenCalledWith(body);
        });
    });

    describe('deleteByAdmin', () => {
        it('wraps the deleted term policy in the response envelope', async () => {
            const deleted: TermPolicy = termPolicy;
            termPolicyDomain.deleteByAdmin.mockResolvedValue(deleted);

            const result = await service.deleteByAdmin('term-policy-1');

            expect(result).toEqual({ data: deleted });
            expect(termPolicyDomain.deleteByAdmin).toHaveBeenCalledWith(
                'term-policy-1'
            );
        });
    });

    describe('publishByAdmin', () => {
        it('returns an empty response after publishing', async () => {
            termPolicyDomain.publishByAdmin.mockResolvedValue(undefined);

            const result = await service.publishByAdmin(
                'term-policy-1',
                'user-1'
            );

            expect(result).toEqual({});
            expect(termPolicyDomain.publishByAdmin).toHaveBeenCalledWith(
                'term-policy-1',
                'user-1'
            );
        });
    });
});

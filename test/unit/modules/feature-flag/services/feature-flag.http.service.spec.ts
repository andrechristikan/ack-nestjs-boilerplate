import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { FeatureFlag } from '@generated/prisma-client/client';
import { FeatureFlagDefaultAvailableSearch } from '@modules/feature-flag/constants/feature-flag.list.constant';
import type { FeatureFlagAdminListRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.admin-list.request.dto';
import type { FeatureFlagSystemListRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.system-list.request.dto';
import type { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import type { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { FeatureFlagHttpService } from '@modules/feature-flag/services/feature-flag.http.service';

describe('FeatureFlagHttpService', () => {
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const pagination = {
        skip: 0,
        limit: 20,
        orderBy: [],
    };

    let service: FeatureFlagHttpService;

    const featureFlag: FeatureFlag = {
        id: '507f1f77bcf86cd799439011',
        key: 'loginWithGoogle',
        description: 'Enables Google sign-in',
        isEnable: true,
        rolloutPercent: 100,
        targetUserIds: [],
        metadata: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagHttpService,
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
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

        service = module.get(FeatureFlagHttpService);
    });

    describe('getListByAdmin', () => {
        it('parses the offset query, merges the store patch, and returns the domain page', async () => {
            const query: FeatureFlagAdminListRequestDto = {
                page: 1,
                perPage: 20,
            };
            paginationQueryUtil.offset.mockReturnValue({
                params: pagination,
                storePatch: { page: 1 },
            });
            const page: IResponsePaginationReturn<FeatureFlag> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                hasNext: false,
                hasPrevious: false,
                page: 1,
                totalPage: 1,
                data: [featureFlag],
            };
            featureFlagDomain.getListByAdmin.mockResolvedValue(page);

            const result = await service.getListByAdmin(query);

            expect(result).toEqual(page);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableSearch: FeatureFlagDefaultAvailableSearch,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { page: 1 }
            );
            expect(featureFlagDomain.getListByAdmin).toHaveBeenCalledWith(
                pagination
            );
        });
    });

    describe('getListCursor', () => {
        it('parses the cursor query, merges the store patch, and returns the domain page', async () => {
            const query: FeatureFlagSystemListRequestDto = {
                perPage: 20,
            };
            paginationQueryUtil.cursor.mockReturnValue({
                params: pagination,
                storePatch: { cursor: 'next-cursor' },
            });
            const page: IResponsePaginationReturn<FeatureFlag> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [featureFlag],
            };
            featureFlagDomain.getListCursor.mockResolvedValue(page);

            const result = await service.getListCursor(query);

            expect(result).toEqual(page);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableSearch: FeatureFlagDefaultAvailableSearch,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { cursor: 'next-cursor' }
            );
            expect(featureFlagDomain.getListCursor).toHaveBeenCalledWith(
                pagination
            );
        });
    });

    describe('updateStatusByAdmin', () => {
        it('wraps the updated flag in the response envelope', async () => {
            const body: FeatureFlagUpdateStatusRequestDto = {
                isEnable: false,
                rolloutPercent: 0,
            };
            const updated = { ...featureFlag, isEnable: false };
            featureFlagDomain.updateStatusByAdmin.mockResolvedValue(updated);

            const result = await service.updateStatusByAdmin(
                '507f1f77bcf86cd799439011',
                body
            );

            expect(result).toEqual({ data: updated });
            expect(featureFlagDomain.updateStatusByAdmin).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439011',
                { isEnable: false, rolloutPercent: 0, targetUserIds: null }
            );
        });
    });

    describe('updateMetadataByAdmin', () => {
        it('wraps the updated flag in the response envelope', async () => {
            const body: FeatureFlagUpdateMetadataRequestDto = {
                metadata: { enabled: true },
            };
            const updated = { ...featureFlag, metadata: { enabled: true } };
            featureFlagDomain.updateMetadataByAdmin.mockResolvedValue(updated);

            const result = await service.updateMetadataByAdmin(
                '507f1f77bcf86cd799439011',
                body
            );

            expect(result).toEqual({ data: updated });
            expect(
                featureFlagDomain.updateMetadataByAdmin
            ).toHaveBeenCalledWith('507f1f77bcf86cd799439011', body);
        });
    });
});

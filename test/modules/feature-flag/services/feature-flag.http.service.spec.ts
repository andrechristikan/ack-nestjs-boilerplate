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
import type { FeatureFlag } from '@generated/prisma-client/client';
import {
    FeatureFlagDefaultAvailableOrderBy,
    FeatureFlagDefaultAvailableSearch,
} from '@modules/feature-flag/constants/feature-flag.list.constant';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import type { FeatureFlagUpdateMetadataRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-metadata.request.dto';
import type { FeatureFlagUpdateStatusRequestDto } from '@modules/feature-flag/dtos/request/feature-flag.update-status.request.dto';
import { FeatureFlagHttpService } from '@modules/feature-flag/services/feature-flag.http.service';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';

describe('FeatureFlagHttpService', () => {
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const accessibleWhere = { isEnable: true };
    const flag = mock<FeatureFlag>();
    const stored = {
        id: 'flag-id',
        key: 'new-home',
        description: 'New home page',
        isEnable: true,
        rolloutPercent: 50,
        metadata: { color: 'blue' },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: null,
    } satisfies FeatureFlag;
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
        data: [flag],
    };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        count: 1,
        perPage: 20,
        hasNext: false,
        cursor: undefined,
        data: [flag],
    };

    let service: FeatureFlagHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityDomain.accessibleWhere.mockReturnValue(accessibleWhere);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FeatureFlagHttpService,
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = module.get(FeatureFlagHttpService);
    });

    describe('getListByAdmin', () => {
        it('passes the read predicate of FeatureFlag to the domain list and shapes the page', async () => {
            const query = {};
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            featureFlagDomain.getListByAdmin.mockResolvedValue(offsetPage);

            const result = await service.getListByAdmin(query);

            expect(policyAbilityDomain.accessibleWhere).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.FeatureFlag
            );
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableSearch: FeatureFlagDefaultAvailableSearch,
                availableOrderBy: FeatureFlagDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                offsetStorePatch
            );
            expect(featureFlagDomain.getListByAdmin).toHaveBeenCalledWith(
                offsetParams,
                accessibleWhere
            );
            expect(result).toEqual(offsetPage);
        });

        it('propagates PolicyForbiddenException and skips the domain when the ability has no read rule', async () => {
            policyAbilityDomain.accessibleWhere.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(service.getListByAdmin({})).rejects.toThrow(
                PolicyForbiddenException
            );
            expect(featureFlagDomain.getListByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('getListCursor', () => {
        it('delegates the cursor list to the domain without a policy predicate', async () => {
            const query = {};
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            featureFlagDomain.getListCursor.mockResolvedValue(cursorPage);

            const result = await service.getListCursor(query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableSearch: FeatureFlagDefaultAvailableSearch,
                availableOrderBy: FeatureFlagDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                cursorStorePatch
            );
            expect(featureFlagDomain.getListCursor).toHaveBeenCalledWith(
                cursorParams
            );
            expect(policyAbilityDomain.accessibleWhere).not.toHaveBeenCalled();
            expect(result).toEqual(cursorPage);
        });
    });

    describe('updateStatusByAdmin', () => {
        const body = {
            isEnable: true,
            rolloutPercent: 50,
        } satisfies FeatureFlagUpdateStatusRequestDto;

        it('checks update on the loaded flag, delegates to the domain and wraps the updated flag', async () => {
            featureFlagDomain.getOne.mockResolvedValue(stored);
            featureFlagDomain.updateStatusByAdmin.mockResolvedValue(flag);

            await expect(
                service.updateStatusByAdmin('flag-id', body)
            ).resolves.toEqual({ data: flag });
            expect(featureFlagDomain.getOne).toHaveBeenCalledWith('flag-id');
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.FeatureFlag, stored)
            );
            expect(featureFlagDomain.updateStatusByAdmin).toHaveBeenCalledWith(
                'flag-id',
                body
            );
        });

        it('throws PolicyForbiddenException and never calls the domain mutation when the record is denied', async () => {
            featureFlagDomain.getOne.mockResolvedValue(stored);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.updateStatusByAdmin('flag-id', body)
            ).rejects.toThrow(PolicyForbiddenException);
            expect(
                featureFlagDomain.updateStatusByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.updateStatusByAdmin('flag-id', body)
            ).rejects.toThrow(RequestContextMissingException);
            expect(
                featureFlagDomain.updateStatusByAdmin
            ).not.toHaveBeenCalled();
        });
    });

    describe('updateMetadataByAdmin', () => {
        const body = {
            metadata: { newFeature: true },
        } satisfies FeatureFlagUpdateMetadataRequestDto;

        it('checks update on the loaded flag, delegates to the domain and wraps the updated flag', async () => {
            featureFlagDomain.getOne.mockResolvedValue(stored);
            featureFlagDomain.updateMetadataByAdmin.mockResolvedValue(flag);

            await expect(
                service.updateMetadataByAdmin('flag-id', body)
            ).resolves.toEqual({ data: flag });
            expect(featureFlagDomain.getOne).toHaveBeenCalledWith('flag-id');
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.FeatureFlag, stored)
            );
            expect(
                featureFlagDomain.updateMetadataByAdmin
            ).toHaveBeenCalledWith('flag-id', body);
        });

        it('throws PolicyForbiddenException and never calls the domain mutation when the record is denied', async () => {
            featureFlagDomain.getOne.mockResolvedValue(stored);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.updateMetadataByAdmin('flag-id', body)
            ).rejects.toThrow(PolicyForbiddenException);
            expect(
                featureFlagDomain.updateMetadataByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.updateMetadataByAdmin('flag-id', body)
            ).rejects.toThrow(RequestContextMissingException);
            expect(
                featureFlagDomain.updateMetadataByAdmin
            ).not.toHaveBeenCalled();
        });
    });
});

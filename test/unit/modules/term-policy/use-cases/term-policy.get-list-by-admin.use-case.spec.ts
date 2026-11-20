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
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyGetListByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.get-list-by-admin.use-case';
import type { TermPolicyAdminListRequestDto } from '@modules/term-policy/dtos/request/term-policy.admin-list.request.dto';

describe('TermPolicyGetListByAdminUseCase', () => {
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();
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
    const offsetParams = {
        skip: 0,
        limit: 20,
        orderBy: [{ createdAt: EnumPaginationOrderDirectionType.desc }],
    };
    const storePatch = {
        page: 1,
        perPage: 20,
        orderBy: 'latest',
        availableSearch: [],
        availableOrderBy: ['latest', 'recentlyPublished', 'latestVersion'],
    };

    let useCase: TermPolicyGetListByAdminUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyGetListByAdminUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(TermPolicyGetListByAdminUseCase);
    });

    describe('execute', () => {
        const query: TermPolicyAdminListRequestDto = { page: 1, perPage: 20 };

        it('merges type and status filters into the pagination store and returns the domain page', async () => {
            termPolicyService.getListByAdmin.mockResolvedValue(offsetPage);

            const result = await useCase.execute({
                ...query,
                type: EnumTermPolicyType.privacy,
                status: EnumTermPolicyStatus.draft,
            });

            expect(result).toEqual(offsetPage);
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...storePatch,
                    filters: {
                        type: [EnumTermPolicyType.privacy],
                        status: [EnumTermPolicyStatus.draft],
                    },
                }
            );
            expect(termPolicyService.getListByAdmin).toHaveBeenCalledWith(
                offsetParams,
                { type: { in: [EnumTermPolicyType.privacy] } },
                { status: { in: [EnumTermPolicyStatus.draft] } }
            );
        });

        it('merges no extra filter when type and status resolve to undefined', async () => {
            termPolicyService.getListByAdmin.mockResolvedValue(offsetPage);

            await useCase.execute(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...storePatch, filters: {} }
            );
            expect(termPolicyService.getListByAdmin).toHaveBeenCalledWith(
                offsetParams,
                undefined,
                undefined
            );
        });
    });
});

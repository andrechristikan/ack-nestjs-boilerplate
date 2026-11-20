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
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyGetListPublishedUseCase } from '@modules/term-policy/use-cases/term-policy.get-list-published.use-case';
import type { TermPolicyPublicListRequestDto } from '@modules/term-policy/dtos/request/term-policy.public-list.request.dto';

describe('TermPolicyGetListPublishedUseCase', () => {
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [] as TermPolicy[],
    };
    const cursorParams = {
        limit: 20,
        orderBy: [{ createdAt: EnumPaginationOrderDirectionType.desc }],
        fingerprint: '2b97837017009251',
    };
    const storePatch = {
        perPage: 20,
        orderBy: 'latest',
        availableSearch: [],
        availableOrderBy: ['latest', 'recentlyPublished', 'latestVersion'],
    };

    let useCase: TermPolicyGetListPublishedUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyGetListPublishedUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(TermPolicyGetListPublishedUseCase);
    });

    describe('execute', () => {
        const query: TermPolicyPublicListRequestDto = { perPage: 20 };

        it('merges the type filter into the pagination store and returns the domain page', async () => {
            termPolicyService.getListPublished.mockResolvedValue(cursorPage);

            const result = await useCase.execute({
                ...query,
                type: EnumTermPolicyType.privacy,
            });

            expect(result).toEqual(cursorPage);
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...storePatch,
                    filters: { type: [EnumTermPolicyType.privacy] },
                }
            );
            expect(termPolicyService.getListPublished).toHaveBeenCalledWith(
                cursorParams,
                { type: { in: [EnumTermPolicyType.privacy] } }
            );
        });

        it('merges no extra filter when type resolves to undefined', async () => {
            termPolicyService.getListPublished.mockResolvedValue(cursorPage);

            await useCase.execute(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...storePatch, filters: {} }
            );
            expect(termPolicyService.getListPublished).toHaveBeenCalledWith(
                { ...cursorParams, fingerprint: 'e92e7b3d052107c0' },
                undefined
            );
        });
    });
});

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
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyGetListUserAcceptedUseCase } from '@modules/term-policy/use-cases/term-policy.get-list-user-accepted.use-case';
import type { TermPolicyAcceptedListRequestDto } from '@modules/term-policy/dtos/request/term-policy.accepted-list.request.dto';
import type { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import {
    buildUser,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('TermPolicyGetListUserAcceptedUseCase', () => {
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const cursorParams = {
        limit: 20,
        orderBy: [{ createdAt: EnumPaginationOrderDirectionType.desc }],
        fingerprint: '0f53ffce0681584b',
    };
    const storePatch = {
        perPage: 20,
        orderBy: 'latest',
        availableSearch: [],
        availableOrderBy: ['latest'],
    };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [] as ITermPolicyUserAcceptance[],
    };

    const userContext = buildUserContext(
        buildUser('user-1', 'user@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    let useCase: TermPolicyGetListUserAcceptedUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyGetListUserAcceptedUseCase,
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        useCase = module.get(TermPolicyGetListUserAcceptedUseCase);
    });

    describe('execute', () => {
        it('merges the pagination store patch and returns the domain page', async () => {
            const query: TermPolicyAcceptedListRequestDto = { perPage: 20 };
            termPolicyAcceptanceService.getListUserAccepted.mockResolvedValue(
                cursorPage
            );

            const result = await useCase.execute(authContext, query);

            expect(result).toEqual(cursorPage);
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(
                termPolicyAcceptanceService.getListUserAccepted
            ).toHaveBeenCalledWith('user-1', cursorParams);
        });
    });
});

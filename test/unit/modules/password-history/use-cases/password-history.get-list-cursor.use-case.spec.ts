import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import type { PasswordHistorySharedListRequestDto } from '@modules/password-history/dtos/request/password-history.shared-list.request.dto';
import { PasswordHistoryGetListCursorUseCase } from '@modules/password-history/use-cases/password-history.get-list-cursor.use-case';
import {
    buildUser,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('PasswordHistoryGetListCursorUseCase', () => {
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const cursorParams: IPaginationQueryCursorParams = {
        fingerprint: '7a5a75d000adcf0b',
        limit: 20,
        orderBy: [{ createdAt: EnumPaginationOrderDirectionType.desc }],
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
        data: [],
    };
    let useCase: PasswordHistoryGetListCursorUseCase;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                PasswordHistoryGetListCursorUseCase,
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
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
        useCase = module.get(PasswordHistoryGetListCursorUseCase);
    });

    describe('execute', () => {
        const query: PasswordHistorySharedListRequestDto = { perPage: 20 };
        const userContext = buildUserContext(
            buildUser('user-id', 'user-id@example.com')
        );
        const authContext = buildAuthJwtAccessContext(userContext.user.id);

        it('merges the pagination store patch and returns the domain page', async () => {
            passwordHistoryService.getListCursor.mockResolvedValue(cursorPage);

            const result = await useCase.execute(authContext, query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
            expect(passwordHistoryService.getListCursor).toHaveBeenCalledWith(
                'user-id',
                cursorParams
            );
            expect(result).toEqual(cursorPage);
        });
    });
});

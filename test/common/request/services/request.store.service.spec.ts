import { ClsService } from 'nestjs-cls';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestStoreService } from '@common/request/services/request.store.service';

describe('RequestStoreService', () => {
    const clsService: MockProxy<ClsService> = mock<ClsService>();

    let service: RequestStoreService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestStoreService,
                { provide: ClsService, useValue: clsService },
            ],
        }).compile();
        service = moduleRef.get(RequestStoreService);
    });

    it('returns null when the store has no value', () => {
        clsService.get.mockReturnValue(undefined);

        expect(service.get('missing')).toBeNull();
    });

    it('merges new fields over an existing stored object', () => {
        clsService.get.mockReturnValue({ page: 1, search: 'old' });

        service.merge('pagination', { search: 'new', perPage: 20 });

        expect(clsService.set).toHaveBeenCalledWith('pagination', {
            page: 1,
            search: 'new',
            perPage: 20,
        });
    });
});

import { ClsService } from 'nestjs-cls';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestStoreService } from '@common/request/services/request.store.service';

describe('RequestStoreService', () => {
    const clsService: Pick<ClsService, 'get' | 'set'> = {
        get: vi.fn(),
        set: vi.fn(),
    };
    const clsGet = vi.mocked(clsService.get);
    const clsSet = vi.mocked(clsService.set);

    let service: RequestStoreService;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new RequestStoreService(clsService as ClsService);
    });

    it('returns null when the store has no value', () => {
        clsGet.mockReturnValue(undefined);

        expect(service.get('missing')).toBeNull();
    });

    it('merges new fields over an existing stored object', () => {
        clsGet.mockReturnValue({ page: 1, search: 'old' });

        service.merge('pagination', { search: 'new', perPage: 20 });

        expect(clsSet).toHaveBeenCalledWith('pagination', {
            page: 1,
            search: 'new',
            perPage: 20,
        });
    });
});

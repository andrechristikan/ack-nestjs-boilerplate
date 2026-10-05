import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('RequestStoreService', () => {
    const clsService: MockProxy<ClsService> = mock<ClsService>();

    let service: RequestStoreService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestStoreService,
                { provide: ClsService, useValue: clsService },
            ],
        }).compile();

        service = module.get(RequestStoreService);
    });

    describe('set', () => {
        it('stores a value under the given key', () => {
            service.set('key', 'value');

            expect(clsService.set).toHaveBeenCalledWith('key', 'value');
        });
    });

    describe('get', () => {
        it('returns the stored value when present', () => {
            clsService.get.mockReturnValue('value');

            expect(service.get('key')).toBe('value');
        });

        it('returns null when nothing is stored', () => {
            clsService.get.mockReturnValue(undefined);

            expect(service.get('key')).toBeNull();
        });
    });

    describe('merge', () => {
        it('merges the patch into an existing stored object', () => {
            clsService.get.mockReturnValue({ a: 1, b: 2 });

            service.merge<{ a: number; b: number }>('key', { b: 3 });

            expect(clsService.set).toHaveBeenCalledWith('key', {
                a: 1,
                b: 3,
            });
        });

        it('merges the patch into an empty object when nothing is stored', () => {
            clsService.get.mockReturnValue(undefined);

            service.merge<{ a: number }>('key', { a: 1 });

            expect(clsService.set).toHaveBeenCalledWith('key', { a: 1 });
        });
    });
});

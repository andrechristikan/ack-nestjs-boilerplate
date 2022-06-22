import { Test } from '@nestjs/testing';
import { CacheService } from 'src/cache/service/cache.service';
import { CoreModule } from 'src/core/core.module';

describe('CacheService', () => {
    let cacheService: CacheService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule],
        }).compile();

        cacheService = moduleRef.get<CacheService>(CacheService);
    });

    it('should be defined', () => {
        expect(cacheService).toBeDefined();
    });

    describe('get', () => {
        it('should be called', async () => {
            const test = jest.spyOn(cacheService, 'get');

            cacheService.get('app.env');
            expect(test).toHaveBeenCalledWith('app.env');
        });

        it('should be success', async () => {
            const env = cacheService.get('app.env');
            jest.spyOn(cacheService, 'get').mockImplementation(() => env);

            expect(cacheService.get('app.env')).toBe(env);
        });
    });

    describe('set', () => {
        it('should be called', async () => {
            const test = jest.spyOn(cacheService, 'set');

            cacheService.set('app.env', 1234567890);
            expect(test).toHaveBeenCalledWith('app.env', 1234567890);
        });

        it('should be success', async () => {
            const env = cacheService.set('app.env', 1234567890);
            jest.spyOn(cacheService, 'set').mockImplementation(() => env);

            expect(cacheService.set('app.env', 1234567890)).toBe(env);
        });
    });

    describe('setNoLimit', () => {
        it('should be called', async () => {
            const test = jest.spyOn(cacheService, 'setNoLimit');

            cacheService.setNoLimit('app.env.test', 1234567890);
            expect(test).toHaveBeenCalledWith('app.env.test', 1234567890);
        });

        it('should be success', async () => {
            const env = cacheService.setNoLimit('app.env.test', 1234567890);
            jest.spyOn(cacheService, 'setNoLimit').mockImplementation(
                () => env
            );

            expect(cacheService.setNoLimit('app.env.test', 1234567890)).toBe(
                env
            );
        });
    });

    describe('delete', () => {
        it('should be called', async () => {
            const test = jest.spyOn(cacheService, 'delete');

            cacheService.delete('app.env.test');
            expect(test).toHaveBeenCalledWith('app.env.test');
        });

        it('should be success', async () => {
            const env = cacheService.delete('app.env.test');
            jest.spyOn(cacheService, 'delete').mockImplementation(() => env);

            expect(cacheService.delete('app.env.test')).toBe(env);
        });
    });

    describe('reset', () => {
        it('should be called', async () => {
            const test = jest.spyOn(cacheService, 'reset');

            cacheService.reset();
            expect(test).toHaveBeenCalledWith();
        });

        it('should be called', async () => {
            const env = cacheService.reset();
            jest.spyOn(cacheService, 'reset').mockImplementation(() => env);

            expect(cacheService.reset()).toBe(env);
        });
    });
});

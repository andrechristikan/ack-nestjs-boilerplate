import { Test } from '@nestjs/testing';
import { CacheOptionsService } from 'src/cache/service/cache.options.service';
import { CoreModule } from 'src/core/core.module';

describe('CacheOptionsService', () => {
    let cacheOptionsService: CacheOptionsService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule, CacheOptionsService],
        }).compile();

        cacheOptionsService =
            moduleRef.get<CacheOptionsService>(CacheOptionsService);
    });

    it('should be defined', () => {
        expect(cacheOptionsService).toBeDefined();
    });

    describe('createCacheOptions', () => {
        it('should be called', async () => {
            const test = jest.spyOn(cacheOptionsService, 'createCacheOptions');

            cacheOptionsService.createCacheOptions();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const options = cacheOptionsService.createCacheOptions();
            jest.spyOn(
                cacheOptionsService,
                'createCacheOptions'
            ).mockImplementation(() => options);

            expect(cacheOptionsService.createCacheOptions()).toBe(options);
        });
    });
});

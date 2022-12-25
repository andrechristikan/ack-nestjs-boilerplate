import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HelperModule } from 'src/common/helper/helper.module';
import { PaginationModule } from 'src/common/pagination/pagination.module';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import configs from 'src/configs';

describe('PaginationService', () => {
    let paginationService: PaginationService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    load: configs,
                    isGlobal: true,
                    cache: true,
                    envFilePath: ['.env'],
                    expandVariables: true,
                }),
                HelperModule,
                PaginationModule,
            ],
        }).compile();

        paginationService = moduleRef.get<PaginationService>(PaginationService);
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(paginationService).toBeDefined();
    });

    describe('skip', () => {
        it('should be skip for page 1', async () => {
            const result: number = await paginationService.skip(1, 10);

            jest.spyOn(paginationService, 'skip').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(0);
        });

        it('should be skip for page 2', async () => {
            const result: number = await paginationService.skip(2, 10);

            jest.spyOn(paginationService, 'skip').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(10);
        });

        it('should be skip for page 100', async () => {
            const result: number = await paginationService.skip(10, 10);

            jest.spyOn(paginationService, 'skip').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(90);
        });

        it('should be skip with max perPage', async () => {
            const result: number = await paginationService.skip(2, 150);

            jest.spyOn(paginationService, 'skip').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(100);
        });

        it('should be skip with max page', async () => {
            const result: number = await paginationService.skip(50, 10);

            jest.spyOn(paginationService, 'skip').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(190);
        });
    });

    describe('totalPage', () => {
        it('should be return a total page base on perPage and total data', async () => {
            const result: number = await paginationService.totalPage(100, 10);

            jest.spyOn(paginationService, 'totalPage').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(10);
        });

        it('should be return a 1 because total data is zero', async () => {
            const result: number = await paginationService.totalPage(0, 10);

            jest.spyOn(paginationService, 'totalPage').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(1);
        });

        it('should be return a max total page ', async () => {
            const result: number = await paginationService.totalPage(10000, 10);

            jest.spyOn(paginationService, 'totalPage').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(20);
        });
    });

    describe('skipWithoutMax', () => {
        it('should be skip for page 1', async () => {
            const result: number = await paginationService.skipWithoutMax(
                1,
                10
            );

            jest.spyOn(paginationService, 'skipWithoutMax').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(0);
        });

        it('should be return skip without depends on max page', async () => {
            const result: number = await paginationService.skipWithoutMax(
                50,
                10
            );

            jest.spyOn(paginationService, 'skipWithoutMax').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(490);
        });

        it('should be return skip without depends on max per page', async () => {
            const result: number = await paginationService.skipWithoutMax(
                2,
                200
            );

            jest.spyOn(paginationService, 'skipWithoutMax').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(200);
        });
    });

    describe('totalPageWithoutMax', () => {
        it('should be return a total page base on perPage and total data', async () => {
            const result: number = await paginationService.totalPageWithoutMax(
                100,
                10
            );

            jest.spyOn(
                paginationService,
                'totalPageWithoutMax'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeDefined();
            expect(result).toBe(10);
        });

        it('should be return a 1 because total data is zero', async () => {
            const result: number = await paginationService.totalPageWithoutMax(
                0,
                10
            );

            jest.spyOn(
                paginationService,
                'totalPageWithoutMax'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeDefined();
            expect(result).toBe(1);
        });

        it('should be return a total page without depends on max page ', async () => {
            const result: number = await paginationService.totalPageWithoutMax(
                10000,
                10
            );

            jest.spyOn(
                paginationService,
                'totalPageWithoutMax'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeDefined();
            expect(result).toBe(1000);
        });
    });
});

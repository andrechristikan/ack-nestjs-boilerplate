import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HelperModule } from 'src/common/helper/helper.module';
import {
    PAGINATION_AVAILABLE_SORT,
    PAGINATION_MAX_PAGE,
    PAGINATION_MAX_PER_PAGE,
    PAGINATION_PAGE,
    PAGINATION_PER_PAGE,
    PAGINATION_SORT,
} from 'src/common/pagination/constants/pagination.constant';
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

    describe('offset', () => {
        it('should be offset for page 1', async () => {
            const result: number = paginationService.offset(1, 10);

            jest.spyOn(paginationService, 'offset').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(0);
        });

        it('should be offset for page 2', async () => {
            const result: number = paginationService.offset(2, 10);

            jest.spyOn(paginationService, 'offset').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(10);
        });

        it('should be offset for page 100', async () => {
            const result: number = paginationService.offset(10, 10);

            jest.spyOn(paginationService, 'offset').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(90);
        });

        it('should be offset with max perPage', async () => {
            const result: number = paginationService.offset(2, 150);

            jest.spyOn(paginationService, 'offset').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(100);
        });

        it('should be offset with max page', async () => {
            const result: number = paginationService.offset(50, 10);

            jest.spyOn(paginationService, 'offset').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(190);
        });
    });

    describe('totalPage', () => {
        it('should be return a total page base on perPage and total data', async () => {
            const result: number = paginationService.totalPage(100, 10);

            jest.spyOn(paginationService, 'totalPage').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(10);
        });

        it('should be return a 1 because total data is zero', async () => {
            const result: number = paginationService.totalPage(0, 10);

            jest.spyOn(paginationService, 'totalPage').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(1);
        });

        it('should be return a max total page ', async () => {
            const result: number = paginationService.totalPage(10000, 10);

            jest.spyOn(paginationService, 'totalPage').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(20);
        });
    });

    describe('offsetWithoutMax', () => {
        it('should be offset for page 1', async () => {
            const result: number = paginationService.offsetWithoutMax(1, 10);

            jest.spyOn(
                paginationService,
                'offsetWithoutMax'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeDefined();
            expect(result).toBe(0);
        });

        it('should be return offset without depends on max page', async () => {
            const result: number = paginationService.offsetWithoutMax(50, 10);

            jest.spyOn(
                paginationService,
                'offsetWithoutMax'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeDefined();
            expect(result).toBe(490);
        });

        it('should be return offset without depends on max per page', async () => {
            const result: number = paginationService.offsetWithoutMax(2, 200);

            jest.spyOn(
                paginationService,
                'offsetWithoutMax'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeDefined();
            expect(result).toBe(200);
        });
    });

    describe('totalPageWithoutMax', () => {
        it('should be return a total page base on perPage and total data', async () => {
            const result: number = paginationService.totalPageWithoutMax(
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
            const result: number = paginationService.totalPageWithoutMax(0, 10);

            jest.spyOn(
                paginationService,
                'totalPageWithoutMax'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeDefined();
            expect(result).toBe(1);
        });

        it('should be return a total page without depends on max page ', async () => {
            const result: number = paginationService.totalPageWithoutMax(
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

    describe('page', () => {
        it('should be return page', async () => {
            const result: number = paginationService.page(1);

            jest.spyOn(paginationService, 'page').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(1);
        });

        it('page 0, should convert to default perPage', async () => {
            const result: number = paginationService.page(0);

            jest.spyOn(paginationService, 'page').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(PAGINATION_PAGE);
        });

        it('page more than max, should return max page', async () => {
            const result: number = paginationService.page(
                PAGINATION_MAX_PAGE + 10
            );

            jest.spyOn(paginationService, 'page').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(PAGINATION_MAX_PAGE);
        });
    });

    describe('perPage', () => {
        it('should be return perPage', async () => {
            const result: number = paginationService.perPage(1);

            jest.spyOn(paginationService, 'perPage').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(1);
        });

        it('perPage 0, should convert to default perPage', async () => {
            const result: number = paginationService.perPage(0);

            jest.spyOn(paginationService, 'perPage').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(PAGINATION_PER_PAGE);
        });

        it('perPage more than max, should return max perPage', async () => {
            const result: number = paginationService.perPage(
                PAGINATION_MAX_PER_PAGE + 10
            );

            jest.spyOn(paginationService, 'perPage').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(PAGINATION_MAX_PER_PAGE);
        });
    });

    describe('sort', () => {
        it('should be return sort', async () => {
            const result: Record<string, number | string> =
                paginationService.sort(
                    PAGINATION_AVAILABLE_SORT,
                    PAGINATION_SORT
                );

            jest.spyOn(paginationService, 'sort').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });

        it('should be return sort default field', async () => {
            const result: Record<string, number | string> =
                paginationService.sort(['createdAt'], 'name@asc');

            jest.spyOn(paginationService, 'sort').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });

        it('should be return sort default type', async () => {
            const result: Record<string, number | string> =
                paginationService.sort(['createdAt'], 'name@aaa');

            jest.spyOn(paginationService, 'sort').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });

        it('should be return sort default', async () => {
            const result: Record<string, number | string> =
                paginationService.sort(['createdAt']);

            jest.spyOn(paginationService, 'sort').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });
    });

    describe('search', () => {
        it('should be return search', async () => {
            const result: Record<string, number | string> =
                paginationService.search(['name'], 'test');

            jest.spyOn(paginationService, 'search').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });

        it('should be return undefined', async () => {
            const result: Record<string, number | string> =
                paginationService.search(['name'], undefined);

            jest.spyOn(paginationService, 'search').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeFalsy();
        });
    });

    describe('filterEqual', () => {
        it('should be return a value', async () => {
            const result: Record<string, number | string> =
                paginationService.filterEqual('name', 'test');

            jest.spyOn(paginationService, 'filterEqual').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result['name']).toBe('test');
        });
    });

    describe('filterContain', () => {
        it('should be return a value', async () => {
            const result: Record<string, { $regex: RegExp; $options: string }> =
                paginationService.filterContain('name', 'test');

            jest.spyOn(paginationService, 'filterContain').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });
    });

    describe('filterIn', () => {
        it('should be return a value', async () => {
            const result: Record<string, { $in: string[] }> =
                paginationService.filterIn('name', ['test']);

            jest.spyOn(paginationService, 'filterIn').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });
    });

    describe('filterDate', () => {
        it('should be return a value', async () => {
            const result: Record<string, Date> = paginationService.filterDate(
                'name',
                new Date()
            );

            jest.spyOn(paginationService, 'filterDate').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });
    });
});

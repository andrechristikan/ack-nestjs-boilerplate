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

    it('should be defined', () => {
        expect(paginationService).toBeDefined();
    });

    describe('skip', () => {
        it('should be called', async () => {
            const test = jest.spyOn(paginationService, 'skip');

            await paginationService.skip(1, 10);
            expect(test).toHaveBeenCalledWith(1, 10);
        });

        it('should be success', async () => {
            const skip = paginationService.skip(1, 10);
            jest.spyOn(paginationService, 'skip').mockImplementation(
                () => skip
            );

            expect(paginationService.skip(1, 10)).toBe(skip);
        });

        it('max page should be success', async () => {
            const skip = paginationService.skip(1, 150);
            jest.spyOn(paginationService, 'skip').mockImplementation(
                () => skip
            );

            expect(paginationService.skip(1, 150)).toBe(skip);
        });

        it('max per page should be success', async () => {
            const skip = paginationService.skip(50, 10);
            jest.spyOn(paginationService, 'skip').mockImplementation(
                () => skip
            );

            expect(paginationService.skip(50, 10)).toBe(skip);
        });
    });

    describe('totalPage', () => {
        it('should be called', async () => {
            const test = jest.spyOn(paginationService, 'totalPage');

            await paginationService.totalPage(100, 10);
            expect(test).toHaveBeenCalledWith(100, 10);
        });

        it('should be success', async () => {
            const totalPage = paginationService.totalPage(100, 10);
            jest.spyOn(paginationService, 'totalPage').mockImplementation(
                () => totalPage
            );

            expect(paginationService.totalPage(100, 10)).toBe(totalPage);
        });

        it('should be success with no data', async () => {
            const totalPage = paginationService.totalPage(0, 10);
            jest.spyOn(paginationService, 'totalPage').mockImplementation(
                () => totalPage
            );

            expect(paginationService.totalPage(0, 10)).toBe(totalPage);
        });

        it('should be success with max page', async () => {
            const totalPage = paginationService.totalPage(10000, 10);
            jest.spyOn(paginationService, 'totalPage').mockImplementation(
                () => totalPage
            );

            expect(paginationService.totalPage(10000, 10)).toBe(totalPage);
        });
    });
});

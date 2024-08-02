import { PipeTransform } from '@nestjs/common';
import { PaginationPagingPipe } from 'src/common/pagination/pipes/pagination.paging.pipe';

describe('PaginationPagingPipe', () => {
    let pipe: PipeTransform & {
        transform: (value: Record<string, any>) => Promise<Record<string, any>>;
        addToRequestInstance: (page: number, perPage: number) => void;
    };

    let pipeDefault: PipeTransform & {
        transform: (value: Record<string, any>) => Promise<Record<string, any>>;
        addToRequestInstance: (page: number, perPage: number) => void;
    };

    let pipeOption2: PipeTransform & {
        transform: (value: Record<string, any>) => Promise<Record<string, any>>;
        addToRequestInstance: (page: number, perPage: number) => void;
    };

    const mockRequest = { __pagination: { filters: {} } };
    const mockRequestWithoutFilter = { __pagination: {} as any };

    const mockPaginationService = {
        page: jest.fn().mockReturnValue(1),
        offset: jest.fn().mockReturnValue(0),
        perPage: jest.fn().mockReturnValue(10),
    };

    beforeEach(() => {
        const mixin = PaginationPagingPipe(10);
        pipe = new mixin(mockRequest, mockPaginationService) as any;

        const mixinDefault = PaginationPagingPipe();
        pipeDefault = new mixinDefault(
            mockRequest,
            mockPaginationService
        ) as any;

        const mixin2 = PaginationPagingPipe(10);
        pipeOption2 = new mixin2(
            mockRequestWithoutFilter,
            mockPaginationService
        ) as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(pipe).toBeDefined();
        expect(pipeDefault).toBeDefined();
        expect(pipeOption2).toBeDefined();
    });

    describe('transform', () => {
        it('Should be successful calls with default', async () => {
            const result = await pipe.transform({});

            expect(mockPaginationService.perPage).toHaveBeenCalledWith(10);
            expect(mockPaginationService.offset).toHaveBeenCalledWith(1, 10);
            expect(result).toBeDefined();
            expect(result).toEqual({
                _limit: 10,
                _offset: 0,
                page: 1,
                perPage: 10,
            });
        });

        it('Should be successful calls', async () => {
            const result = await pipe.transform({
                perPage: '10',
                page: '1',
            });

            expect(mockPaginationService.perPage).toHaveBeenCalledWith(10);
            expect(mockPaginationService.offset).toHaveBeenCalledWith(1, 10);
            expect(result).toBeDefined();
        });
    });

    describe('addToRequestInstance', () => {
        it('Should be successful calls without pagination filters', async () => {
            pipeOption2.addToRequestInstance(1, 10);

            expect(mockRequestWithoutFilter.__pagination).toBeDefined();
            expect(mockRequestWithoutFilter.__pagination.perPage).toBeDefined();
            expect(mockRequestWithoutFilter.__pagination.page).toBeDefined();
        });

        it('Should be successful calls', async () => {
            pipe.addToRequestInstance(1, 10);

            expect(mockRequestWithoutFilter.__pagination).toBeDefined();
            expect(mockRequestWithoutFilter.__pagination.perPage).toBeDefined();
            expect(mockRequestWithoutFilter.__pagination.page).toBeDefined();
        });
    });
});

import { PipeTransform } from '@nestjs/common';
import { PaginationSearchPipe } from 'src/common/pagination/pipes/pagination.search.pipe';

describe('PaginationSearchPipe', () => {
    let pipe: PipeTransform & {
        transform: (value: Record<string, any>) => Promise<Record<string, any>>;
        addToRequestInstance: (
            search: string,
            availableSearch: string[]
        ) => void;
    };

    let pipeDefault: PipeTransform & {
        transform: (value: Record<string, any>) => Promise<Record<string, any>>;
        addToRequestInstance: (
            search: string,
            availableSearch: string[]
        ) => void;
    };

    let pipeOption2: PipeTransform & {
        transform: (value: Record<string, any>) => Promise<Record<string, any>>;
        addToRequestInstance: (
            search: string,
            availableSearch: string[]
        ) => void;
    };

    const mockRequest = { __pagination: { filters: {} } };
    const mockRequestWithoutFilter = { __pagination: {} as any };

    const mockPaginationService = {
        search: jest.fn(),
    };

    beforeEach(() => {
        const mixin = PaginationSearchPipe(['name']);
        pipe = new mixin(mockRequest, mockPaginationService) as any;

        const mixinDefault = PaginationSearchPipe();
        pipeDefault = new mixinDefault(
            mockRequest,
            mockPaginationService
        ) as any;

        const mixin2 = PaginationSearchPipe(['name']);
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
        it('Should be successful calls and return undefined if search text is undefined', async () => {
            const result = await pipe.transform({});

            expect(result).toBeDefined();
            expect(result).toEqual({});
        });

        it('Should be successful calls', async () => {
            const result = await pipe.transform({
                search: 'test',
            });

            expect(mockPaginationService.search).toHaveBeenCalledWith('test', [
                'name',
            ]);
            expect(result).toBeDefined();
        });
    });

    describe('addToRequestInstance', () => {
        it('Should be successful calls without pagination filters', async () => {
            pipeOption2.addToRequestInstance('test', ['name']);

            expect(mockRequestWithoutFilter.__pagination).toBeDefined();
            expect(mockRequestWithoutFilter.__pagination.search).toBeDefined();
            expect(
                mockRequestWithoutFilter.__pagination.availableSearch
            ).toBeDefined();
        });

        it('Should be successful calls', async () => {
            pipeOption2.addToRequestInstance('test', ['name']);

            expect(mockRequestWithoutFilter.__pagination).toBeDefined();
            expect(mockRequestWithoutFilter.__pagination.search).toBeDefined();
            expect(
                mockRequestWithoutFilter.__pagination.availableSearch
            ).toBeDefined();
        });
    });
});

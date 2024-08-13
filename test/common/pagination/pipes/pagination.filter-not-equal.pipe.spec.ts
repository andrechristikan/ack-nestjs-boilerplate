import { PipeTransform } from '@nestjs/common';
import { DatabaseQueryNotEqual } from 'src/common/database/decorators/database.decorator';
import { PaginationFilterNotEqualPipe } from 'src/common/pagination/pipes/pagination.filter-not-equal.pipe';

describe('PaginationFilterNotEqualPipe', () => {
    let pipe: PipeTransform & {
        transform: (value: string) => Promise<Record<string, string | number>>;
        addToRequestInstance: (value: any) => void;
    };

    let pipeOptionRaw: PipeTransform & {
        transform: (value: string) => Promise<Record<string, string | number>>;
        addToRequestInstance: (value: any) => void;
    };

    let pipeOptionIsNumber: PipeTransform & {
        transform: (value: string) => Promise<Record<string, string | number>>;
        addToRequestInstance: (value: any) => void;
    };

    let pipeOption2: PipeTransform & {
        transform: (value: string) => Promise<Record<string, string | number>>;
        addToRequestInstance: (value: any) => void;
    };

    const mockRequest = { __pagination: { filters: {} } };
    const mockRequestWithoutFilter = { __pagination: {} as any };

    const mockPaginationService = {
        filterNotEqual: jest
            .fn()
            .mockImplementation((a: string, b: string) =>
                DatabaseQueryNotEqual(a, b)
            ),
    };

    beforeEach(() => {
        const mixin = PaginationFilterNotEqualPipe('test');
        pipe = new mixin(mockRequest, mockPaginationService) as any;

        const mixinOption = PaginationFilterNotEqualPipe('test', {
            raw: true,
        });
        pipeOptionRaw = new mixinOption(
            mockRequest,
            mockPaginationService
        ) as any;

        const mixinIsNumber = PaginationFilterNotEqualPipe('test', {
            isNumber: true,
        });
        pipeOptionIsNumber = new mixinIsNumber(
            mockRequest,
            mockPaginationService
        ) as any;

        const mixin2 = PaginationFilterNotEqualPipe('test');
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
        expect(pipeOptionRaw).toBeDefined();
    });

    describe('transform', () => {
        it('Should return undefined if value is undefined', async () => {
            const result = await pipe.transform(undefined);

            expect(result).toBeUndefined();
        });

        it('Should return raw if raw options is true', async () => {
            const result = await pipeOptionRaw.transform('string');

            expect(result).toBeDefined();
            expect(result).toEqual({
                test: 'string',
            });
        });

        it('Should convert string to number if option isNumber is true', async () => {
            const result = await pipeOptionIsNumber.transform('1');

            expect(result).toBeDefined();
            expect(result).toEqual(DatabaseQueryNotEqual('test', 1));
        });

        it('Should be successful calls', async () => {
            const result = await pipe.transform('string');

            expect(result).toBeDefined();
        });
    });

    describe('addToRequestInstance', () => {
        it('Should be successful calls without pagination filters', async () => {
            pipeOption2.addToRequestInstance('string');

            expect(mockRequestWithoutFilter.__pagination.filters).toBeDefined();
            expect(mockRequestWithoutFilter.__pagination.filters.test).toEqual(
                'string'
            );
        });

        it('Should be successful calls', async () => {
            pipe.addToRequestInstance('string');

            expect(mockRequestWithoutFilter.__pagination.filters).toBeDefined();
            expect(mockRequestWithoutFilter.__pagination.filters.test).toEqual(
                'string'
            );
        });
    });
});

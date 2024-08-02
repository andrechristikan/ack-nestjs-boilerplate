import { PipeTransform } from '@nestjs/common';
import { DatabaseQueryContain } from 'src/common/database/decorators/database.decorator';
import { PaginationFilterStringContainPipe } from 'src/common/pagination/pipes/pagination.filter-string-contain.pipe';

describe('PaginationFilterStringContainPipe', () => {
    let pipe: PipeTransform & {
        transform: (value: string) => Promise<Record<string, any>>;
        addToRequestInstance: (value: any) => void;
    };

    let pipeOptionRaw: PipeTransform & {
        transform: (value: string) => Promise<Record<string, any>>;
        addToRequestInstance: (value: any) => void;
    };

    let pipeOption2: PipeTransform & {
        transform: (value: string) => Promise<Record<string, any>>;
        addToRequestInstance: (value: any) => void;
    };

    const mockRequest = { __pagination: { filters: {} } };
    const mockRequestWithoutFilter = { __pagination: {} as any };

    const mockPaginationService = {
        filterContain: jest
            .fn()
            .mockImplementation((a: string, b: string) =>
                DatabaseQueryContain(a, b)
            ),
    };

    beforeEach(() => {
        const mixin = PaginationFilterStringContainPipe('test');
        pipe = new mixin(mockRequest, mockPaginationService) as any;

        const mixinOption = PaginationFilterStringContainPipe('test', {
            raw: true,
        });
        pipeOptionRaw = new mixinOption(
            mockRequest,
            mockPaginationService
        ) as any;

        const mixin2 = PaginationFilterStringContainPipe('test');
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
        expect(pipeOption2).toBeDefined();
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

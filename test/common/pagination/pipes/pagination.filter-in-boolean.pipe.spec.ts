import { PipeTransform } from '@nestjs/common';
import _ from 'lodash';
import { DatabaseQueryIn } from 'src/common/database/decorators/database.decorator';
import { PaginationFilterInBooleanPipe } from 'src/common/pagination/pipes/pagination.filter-in-boolean.pipe';

describe('PaginationFilterInBooleanPipe', () => {
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

    const mockHelperArrayService = {
        unique: jest.fn().mockImplementation(e => _.uniq(e)),
    };

    const mockPaginationService = {
        filterIn: jest
            .fn()
            .mockImplementation((a: string, b: boolean[]) =>
                DatabaseQueryIn<boolean>(a, b)
            ),
    };

    beforeEach(() => {
        const mixin = PaginationFilterInBooleanPipe('test', [true, false]);
        pipe = new mixin(
            mockRequest,
            mockPaginationService,
            mockHelperArrayService
        ) as any;

        const mixinOption = PaginationFilterInBooleanPipe(
            'test',
            [true, false],
            {
                raw: true,
            }
        );
        pipeOptionRaw = new mixinOption(
            mockRequest,
            mockPaginationService,
            mockHelperArrayService
        ) as any;

        const mixin2 = PaginationFilterInBooleanPipe('test', [true, false]);
        pipeOption2 = new mixin2(
            mockRequestWithoutFilter,
            mockPaginationService,
            mockHelperArrayService
        ) as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(pipe).toBeDefined();
        expect(pipeOption2).toBeDefined();
        expect(pipeOptionRaw).toBeDefined();
    });

    describe('transform', () => {
        it('Should return default value if value is undefined', async () => {
            const result = await pipe.transform(undefined);

            expect(result).toBeDefined();
            expect(result).toEqual(DatabaseQueryIn('test', [true, false]));
        });

        it('Should return raw if raw options is true', async () => {
            const result = await pipeOptionRaw.transform('true,false');

            expect(result).toBeDefined();
            expect(result).toEqual({ test: 'true,false' });
        });

        it('Should be successful calls', async () => {
            const result = await pipe.transform('true,false');

            expect(result).toBeDefined();
            expect(result).toEqual(DatabaseQueryIn('test', [true, false]));
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

import { PipeTransform } from '@nestjs/common';
import _ from 'lodash';
import { DatabaseQueryNin } from 'src/common/database/decorators/database.decorator';
import { PaginationFilterNinEnumPipe } from 'src/common/pagination/pipes/pagination.filter-nin-enum.pipe';

describe('PaginationFilterNinEnumPipe', () => {
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
        getIntersection: jest
            .fn()
            .mockImplementation((a, b) => _.intersection(a, b)),
    };

    const mockPaginationService = {
        filterNin: jest
            .fn()
            .mockImplementation((a: string, b: string[]) =>
                DatabaseQueryNin<string>(a, b)
            ),
    };

    beforeEach(() => {
        const mixin = PaginationFilterNinEnumPipe(
            'test',
            ['123'],
            ['123', '321']
        );
        pipe = new mixin(
            mockRequest,
            mockPaginationService,
            mockHelperArrayService
        ) as any;

        const mixinOption = PaginationFilterNinEnumPipe(
            'test',
            ['123'],
            ['123', '321'],
            {
                raw: true,
            }
        );
        pipeOptionRaw = new mixinOption(
            mockRequest,
            mockPaginationService,
            mockHelperArrayService
        ) as any;

        const mixin2 = PaginationFilterNinEnumPipe(
            'test',
            ['123'],
            ['123', '321']
        );
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
            expect(result).toEqual(DatabaseQueryNin('test', ['123']));
        });

        it('Should return raw if raw options is true', async () => {
            const result = await pipeOptionRaw.transform('asd,qwerty');

            expect(result).toBeDefined();
            expect(result).toEqual({ test: 'asd,qwerty' });
        });

        it('Should be successful calls', async () => {
            const result = await pipe.transform('123,qwerty');

            expect(result).toBeDefined();
            expect(result).toEqual(DatabaseQueryNin('test', ['123']));
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

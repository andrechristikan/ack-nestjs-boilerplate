import { PipeTransform } from '@nestjs/common';
import moment from 'moment';
import { DatabaseQueryEqual } from 'src/common/database/decorators/database.decorator';
import { ENUM_PAGINATION_FILTER_DATE_TIME_OPTIONS } from 'src/common/pagination/enums/pagination.enum';
import { PaginationFilterDatePipe } from 'src/common/pagination/pipes/pagination.filter-date.pipe';

describe('PaginationFilterDatePipe', () => {
    let pipe: PipeTransform & {
        transform: (value: string) => Promise<Record<string, Date | string>>;
        addToRequestInstance: (value: any) => void;
    };

    let pipeOptionRaw: PipeTransform & {
        transform: (value: string) => Promise<Record<string, Date | string>>;
        addToRequestInstance: (value: any) => void;
    };

    let pipeOptionEndDay: PipeTransform & {
        transform: (value: string) => Promise<Record<string, Date | string>>;
        addToRequestInstance: (value: any) => void;
    };

    let pipeOptionStartDay: PipeTransform & {
        transform: (value: string) => Promise<Record<string, Date | string>>;
        addToRequestInstance: (value: any) => void;
    };

    let pipeOption2: PipeTransform & {
        transform: (value: string) => Promise<Record<string, Date | string>>;
        addToRequestInstance: (value: any) => void;
    };

    const mockRequest = { __pagination: { filters: {} } };
    const mockRequestWithoutFilter = { __pagination: {} as any };

    const mockPaginationService = {
        filterDate: jest
            .fn()
            .mockImplementation((a: string, b: Date) =>
                DatabaseQueryEqual(a, b)
            ),
    };

    const mockHelperDateService = {
        create: jest.fn(),
        endOfDay: jest.fn(),
        startOfDay: jest.fn(),
    };

    beforeEach(() => {
        const mixin = PaginationFilterDatePipe('test');
        pipe = new mixin(
            mockRequest,
            mockPaginationService,
            mockHelperDateService
        ) as any;

        const mixinOption = PaginationFilterDatePipe('test', {
            raw: true,
        });
        pipeOptionRaw = new mixinOption(
            mockRequest,
            mockPaginationService,
            mockHelperDateService
        ) as any;

        const mixinEndDay = PaginationFilterDatePipe('test', {
            time: ENUM_PAGINATION_FILTER_DATE_TIME_OPTIONS.END_OF_DAY,
        });
        pipeOptionEndDay = new mixinEndDay(
            mockRequest,
            mockPaginationService,
            mockHelperDateService
        ) as any;

        const mixinOStartDay = PaginationFilterDatePipe('test', {
            time: ENUM_PAGINATION_FILTER_DATE_TIME_OPTIONS.START_OF_DAY,
        });
        pipeOptionStartDay = new mixinOStartDay(
            mockRequest,
            mockPaginationService,
            mockHelperDateService
        ) as any;

        const mixin2 = PaginationFilterDatePipe('test');
        pipeOption2 = new mixin2(
            mockRequestWithoutFilter,
            mockPaginationService,
            mockHelperDateService
        ) as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(pipe).toBeDefined();
        expect(pipeOptionRaw).toBeDefined();
        expect(pipeOptionEndDay).toBeDefined();
        expect(pipeOptionStartDay).toBeDefined();
        expect(pipeOption2).toBeDefined();
    });

    describe('transform', () => {
        it('Should return undefined if value is undefined', async () => {
            const result = await pipe.transform(undefined);

            expect(result).toBeUndefined();
        });

        it('Should return raw if raw options is true', async () => {
            const today = new Date();
            const result = await pipeOptionRaw.transform(today.toISOString());

            expect(result).toBeDefined();
            expect(result).toEqual({
                test: today.toISOString(),
            });
        });

        it('Should convert date to end of day if option time is END DAY', async () => {
            const today = new Date();
            const endDay = moment(today).endOf('day').toDate();
            mockHelperDateService.endOfDay.mockReturnValue(endDay);

            const result = await pipeOptionEndDay.transform(
                today.toISOString()
            );

            expect(result).toBeDefined();
            expect(result).toEqual(DatabaseQueryEqual('test', endDay));
        });

        it('Should convert date to end of day if option time is START DAY', async () => {
            const today = new Date();
            const startDay = moment(today).startOf('day').toDate();
            mockHelperDateService.startOfDay.mockReturnValue(startDay);

            const result = await pipeOptionStartDay.transform(
                today.toISOString()
            );

            expect(result).toBeDefined();
            expect(result).toEqual(DatabaseQueryEqual('test', startDay));
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

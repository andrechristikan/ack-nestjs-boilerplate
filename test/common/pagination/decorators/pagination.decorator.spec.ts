import {
    PaginationQuery,
    PaginationQueryFilterDate,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInBoolean,
    PaginationQueryFilterInEnum,
    PaginationQueryFilterNinEnum,
    PaginationQueryFilterNotEqual,
    PaginationQueryFilterStringContain,
} from 'src/common/pagination/decorators/pagination.decorator';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { PaginationFilterDatePipe } from 'src/common/pagination/pipes/pagination.filter-date.pipe';
import { PaginationFilterEqualPipe } from 'src/common/pagination/pipes/pagination.filter-equal.pipe';
import { PaginationFilterInBooleanPipe } from 'src/common/pagination/pipes/pagination.filter-in-boolean.pipe';
import { PaginationFilterInEnumPipe } from 'src/common/pagination/pipes/pagination.filter-in-enum.pipe';
import { PaginationFilterNinEnumPipe } from 'src/common/pagination/pipes/pagination.filter-nin-enum.pipe';
import { PaginationFilterNotEqualPipe } from 'src/common/pagination/pipes/pagination.filter-not-equal.pipe';
import { PaginationFilterStringContainPipe } from 'src/common/pagination/pipes/pagination.filter-string-contain.pipe';
import { PaginationOrderPipe } from 'src/common/pagination/pipes/pagination.order.pipe';
import { PaginationPagingPipe } from 'src/common/pagination/pipes/pagination.paging.pipe';
import { PaginationSearchPipe } from 'src/common/pagination/pipes/pagination.search.pipe';

jest.mock('src/common/pagination/pipes/pagination.filter-date.pipe', () => ({
    PaginationFilterDatePipe: jest.fn(),
}));
jest.mock('src/common/pagination/pipes/pagination.filter-equal.pipe', () => ({
    PaginationFilterEqualPipe: jest.fn(),
}));
jest.mock(
    'src/common/pagination/pipes/pagination.filter-in-boolean.pipe',
    () => ({
        PaginationFilterInBooleanPipe: jest.fn(),
    })
);
jest.mock('src/common/pagination/pipes/pagination.filter-in-enum.pipe', () => ({
    PaginationFilterInEnumPipe: jest.fn(),
}));
jest.mock(
    'src/common/pagination/pipes/pagination.filter-nin-enum.pipe',
    () => ({
        PaginationFilterNinEnumPipe: jest.fn(),
    })
);
jest.mock(
    'src/common/pagination/pipes/pagination.filter-not-equal.pipe',
    () => ({
        PaginationFilterNotEqualPipe: jest.fn(),
    })
);
jest.mock(
    'src/common/pagination/pipes/pagination.filter-string-contain.pipe',
    () => ({
        PaginationFilterStringContainPipe: jest.fn(),
    })
);
jest.mock('src/common/pagination/pipes/pagination.order.pipe', () => ({
    PaginationOrderPipe: jest.fn(),
}));
jest.mock('src/common/pagination/pipes/pagination.paging.pipe', () => ({
    PaginationPagingPipe: jest.fn(),
}));
jest.mock('src/common/pagination/pipes/pagination.search.pipe', () => ({
    PaginationSearchPipe: jest.fn(),
}));

describe('Pagination Decorators', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('PaginationQuery', () => {
        it('Should return applyDecorators', async () => {
            const result = PaginationQuery();

            expect(result).toBeTruthy();
            expect(PaginationSearchPipe).toHaveBeenCalledWith(undefined);
            expect(PaginationPagingPipe).toHaveBeenCalledWith(undefined);
            expect(PaginationOrderPipe).toHaveBeenCalledWith(
                undefined,
                undefined,
                undefined
            );
        });

        it('Should return applyDecorators with options', async () => {
            const result = PaginationQuery({
                availableOrderBy: ['createdAt'],
                availableSearch: ['name'],
                defaultOrderBy: 'createdAt',
                defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                defaultPerPage: 10,
            });

            expect(result).toBeTruthy();
            expect(PaginationSearchPipe).toHaveBeenCalledWith(['name']);
            expect(PaginationPagingPipe).toHaveBeenCalledWith(10);
            expect(PaginationOrderPipe).toHaveBeenCalledWith(
                'createdAt',
                ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                ['createdAt']
            );
        });
    });

    describe('PaginationQueryFilterInBoolean', () => {
        it('Should return applyDecorators', async () => {
            const result = PaginationQueryFilterInBoolean('test', [
                true,
                false,
            ]);

            expect(result).toBeTruthy();
            expect(PaginationFilterInBooleanPipe).toHaveBeenCalledWith(
                'test',
                [true, false],
                undefined
            );
        });

        it('Should return applyDecorators with options', async () => {
            const result = PaginationQueryFilterInBoolean(
                'test',
                [true, false],
                {
                    queryField: 'testQuery',
                }
            );

            expect(result).toBeTruthy();
            expect(PaginationFilterInBooleanPipe).toHaveBeenCalledWith(
                'test',
                [true, false],
                {
                    queryField: 'testQuery',
                }
            );
        });
    });

    describe('PaginationQueryFilterInEnum', () => {
        it('Should return applyDecorators', async () => {
            const result = PaginationQueryFilterInEnum(
                'test',
                ['12345'],
                ['12345', '67890']
            );

            expect(result).toBeTruthy();
            expect(PaginationFilterInEnumPipe).toHaveBeenCalledWith(
                'test',
                ['12345'],
                ['12345', '67890'],
                undefined
            );
        });

        it('Should return applyDecorators with options', async () => {
            const result = PaginationQueryFilterInEnum(
                'test',
                ['12345'],
                ['12345', '67890'],
                {
                    queryField: 'testQuery',
                }
            );

            expect(result).toBeTruthy();
            expect(PaginationFilterInEnumPipe).toHaveBeenCalledWith(
                'test',
                ['12345'],
                ['12345', '67890'],
                {
                    queryField: 'testQuery',
                }
            );
        });
    });

    describe('PaginationQueryFilterNinEnum', () => {
        it('Should return applyDecorators', async () => {
            const result = PaginationQueryFilterNinEnum(
                'test',
                ['12345'],
                ['12345', '67890']
            );

            expect(result).toBeTruthy();
            expect(PaginationFilterNinEnumPipe).toHaveBeenCalledWith(
                'test',
                ['12345'],
                ['12345', '67890'],
                undefined
            );
        });

        it('Should return applyDecorators with options', async () => {
            const result = PaginationQueryFilterNinEnum(
                'test',
                ['12345'],
                ['12345', '67890'],
                {
                    queryField: 'testQuery',
                }
            );

            expect(result).toBeTruthy();
            expect(PaginationFilterNinEnumPipe).toHaveBeenCalledWith(
                'test',
                ['12345'],
                ['12345', '67890'],
                {
                    queryField: 'testQuery',
                }
            );
        });
    });

    describe('PaginationQueryFilterNotEqual', () => {
        it('Should return applyDecorators', async () => {
            const result = PaginationQueryFilterNotEqual('test');

            expect(result).toBeTruthy();
            expect(PaginationFilterNotEqualPipe).toHaveBeenCalledWith(
                'test',
                undefined
            );
        });

        it('Should return applyDecorators with options', async () => {
            const result = PaginationQueryFilterNotEqual('test', {
                queryField: 'testQuery',
            });

            expect(result).toBeTruthy();
            expect(PaginationFilterNotEqualPipe).toHaveBeenCalledWith('test', {
                queryField: 'testQuery',
            });
        });
    });

    describe('PaginationQueryFilterEqual', () => {
        it('Should return applyDecorators', async () => {
            const result = PaginationQueryFilterEqual('test');

            expect(result).toBeTruthy();
            expect(PaginationFilterEqualPipe).toHaveBeenCalledWith(
                'test',
                undefined
            );
        });

        it('Should return applyDecorators with options', async () => {
            const result = PaginationQueryFilterEqual('test', {
                queryField: 'testQuery',
            });

            expect(result).toBeTruthy();
            expect(PaginationFilterEqualPipe).toHaveBeenCalledWith('test', {
                queryField: 'testQuery',
            });
        });
    });

    describe('PaginationQueryFilterStringContain', () => {
        it('Should return applyDecorators', async () => {
            const result = PaginationQueryFilterStringContain('test');

            expect(result).toBeTruthy();
            expect(PaginationFilterStringContainPipe).toHaveBeenCalledWith(
                'test',
                undefined
            );
        });

        it('Should return applyDecorators with options', async () => {
            const result = PaginationQueryFilterStringContain('test', {
                queryField: 'testQuery',
            });

            expect(result).toBeTruthy();
            expect(PaginationFilterStringContainPipe).toHaveBeenCalledWith(
                'test',
                {
                    queryField: 'testQuery',
                }
            );
        });
    });

    describe('PaginationQueryFilterDate', () => {
        it('Should return applyDecorators', async () => {
            const result = PaginationQueryFilterDate('test');

            expect(result).toBeTruthy();
            expect(PaginationFilterDatePipe).toHaveBeenCalledWith(
                'test',
                undefined
            );
        });

        it('Should return applyDecorators with options', async () => {
            const result = PaginationQueryFilterDate('test', {
                queryField: 'testQuery',
            });

            expect(result).toBeTruthy();
            expect(PaginationFilterDatePipe).toHaveBeenCalledWith('test', {
                queryField: 'testQuery',
            });
        });
    });
});

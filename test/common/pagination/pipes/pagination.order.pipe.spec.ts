import { PipeTransform } from '@nestjs/common';
import { PAGINATION_DEFAULT_ORDER_DIRECTION } from 'src/common/pagination/constants/pagination.constant';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { PaginationOrderPipe } from 'src/common/pagination/pipes/pagination.order.pipe';

describe('PaginationOrderPipe', () => {
    let pipe: PipeTransform & {
        transform: (value: Record<string, any>) => Promise<Record<string, any>>;
        addToRequestInstance: (
            orderBy: string,
            orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
            availableOrderBy: string[],
            availableOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE[]
        ) => void;
    };

    let pipeDefault: PipeTransform & {
        transform: (value: Record<string, any>) => Promise<Record<string, any>>;
        addToRequestInstance: (
            orderBy: string,
            orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
            availableOrderBy: string[],
            availableOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE[]
        ) => void;
    };

    let pipeOption2: PipeTransform & {
        transform: (value: Record<string, any>) => Promise<Record<string, any>>;
        addToRequestInstance: (
            orderBy: string,
            orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE,
            availableOrderBy: string[],
            availableOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE[]
        ) => void;
    };

    const mockRequest = { __pagination: { filters: {} } };
    const mockRequestWithoutFilter = { __pagination: {} as any };

    const mockPaginationService = {
        order: jest.fn().mockReturnValue({
            createdAt: PAGINATION_DEFAULT_ORDER_DIRECTION,
        }),
    };

    beforeEach(() => {
        const mixin = PaginationOrderPipe(
            'createdAt',
            PAGINATION_DEFAULT_ORDER_DIRECTION,
            ['createdAt']
        );
        pipe = new mixin(mockRequest, mockPaginationService) as any;

        const mixinDefault = PaginationOrderPipe();
        pipeDefault = new mixinDefault(
            mockRequest,
            mockPaginationService
        ) as any;

        const mixin2 = PaginationOrderPipe(
            'createdAt',
            PAGINATION_DEFAULT_ORDER_DIRECTION,
            ['createdAt']
        );
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
        it('Should be successful calls  with default', async () => {
            const result = await pipe.transform({});

            expect(mockPaginationService.order).toHaveBeenCalledWith(
                'createdAt',
                'asc',
                ['createdAt']
            );
            expect(result).toBeDefined();
            expect(result).toEqual({
                _availableOrderBy: ['createdAt'],
                _availableOrderDirection: ['asc', 'desc'],
                _order: {
                    createdAt: 'asc',
                },
            });
        });

        it('Should be successful calls', async () => {
            const result = await pipe.transform({
                orderBy: 'createdAt',
                orderDirection: 'asc',
            });

            expect(mockPaginationService.order).toHaveBeenCalledWith(
                'createdAt',
                'asc',
                ['createdAt']
            );
            expect(result).toBeDefined();
        });
    });

    describe('addToRequestInstance', () => {
        it('Should be successful calls without pagination filters', async () => {
            pipeOption2.addToRequestInstance(
                'createdAt',
                ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                ['createdAt'],
                [
                    ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                    ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                ]
            );

            expect(mockRequestWithoutFilter.__pagination).toBeDefined();
            expect(mockRequestWithoutFilter.__pagination.orderBy).toBeDefined();
            expect(
                mockRequestWithoutFilter.__pagination.orderDirection
            ).toBeDefined();
            expect(
                mockRequestWithoutFilter.__pagination.availableOrderBy
            ).toBeDefined();
            expect(
                mockRequestWithoutFilter.__pagination.availableOrderDirection
            ).toBeDefined();
        });

        it('Should be successful calls', async () => {
            pipe.addToRequestInstance(
                'createdAt',
                ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                ['createdAt'],
                [
                    ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                    ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                ]
            );

            expect(mockRequestWithoutFilter.__pagination).toBeDefined();
            expect(mockRequestWithoutFilter.__pagination.orderBy).toBeDefined();
            expect(
                mockRequestWithoutFilter.__pagination.orderDirection
            ).toBeDefined();
            expect(
                mockRequestWithoutFilter.__pagination.availableOrderBy
            ).toBeDefined();
            expect(
                mockRequestWithoutFilter.__pagination.availableOrderDirection
            ).toBeDefined();
        });
    });
});

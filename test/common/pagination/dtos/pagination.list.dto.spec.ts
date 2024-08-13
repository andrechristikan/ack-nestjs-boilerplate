import { plainToInstance } from 'class-transformer';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';

describe('PaginationListDto', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should be successful calls', () => {
        const response: PaginationListDto = {
            _search: { name: 'testSearch' },
            _limit: 10,
            _offset: 1,
            _order: {
                createdAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
            },
            _availableOrderBy: ['createAt'],
            _availableOrderDirection: Object.values(
                ENUM_PAGINATION_ORDER_DIRECTION_TYPE
            ),
            perPage: 10,
            page: 1,
            orderBy: 'createdAt',
            orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
        };

        const dto = plainToInstance(PaginationListDto, response);

        expect(dto).toBeInstanceOf(PaginationListDto);
        expect(dto._search).toBeDefined();
        expect(dto._limit).toBeDefined();
        expect(dto._offset).toBeDefined();
        expect(dto._order).toBeDefined();
        expect(dto._availableOrderBy).toBeDefined();
        expect(dto._availableOrderDirection).toBeDefined();
        expect(dto.perPage).toBeDefined();
        expect(dto.page).toBeDefined();
        expect(dto.orderBy).toBeDefined();
        expect(dto.orderDirection).toBeDefined();
    });
});

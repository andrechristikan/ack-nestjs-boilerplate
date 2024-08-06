import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { ResponsePagingDto } from 'src/common/response/dtos/response.paging.dto';

describe('ResponsePagingDto', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should be successful calls', () => {
        const response: ResponsePagingDto = {
            _metadata: {
                language: faker.helpers.arrayElement(
                    Object.values(ENUM_MESSAGE_LANGUAGE)
                ),
                path: '/path/test',
                repoVersion: '1.0.0',
                timestamp: faker.date.anytime().valueOf(),
                timezone: 'Asia/Jakarta',
                version: '1',
                pagination: {
                    search: 'testSearch',
                    filters: {
                        status: 'statusTest',
                    },
                    page: 1,
                    perPage: 10,
                    orderBy: 'createdAt',
                    orderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                    availableSearch: [],
                    availableOrderBy: ['createAt'],
                    availableOrderDirection: Object.values(
                        ENUM_PAGINATION_ORDER_DIRECTION_TYPE
                    ),
                    total: 5,
                    totalPage: 1,
                },
            },
            message: 'testMessage',
            statusCode: 200,
            data: [],
        };

        const dto = plainToInstance(ResponsePagingDto, response);

        expect(dto).toBeInstanceOf(ResponsePagingDto);
        expect(dto.data).toBeDefined();
        expect(dto.data).toEqual([]);
        expect(dto.statusCode).toBeDefined();
        expect(dto.message).toBeDefined();
        expect(dto._metadata).toBeDefined();
        expect(dto._metadata.language).toBeDefined();
        expect(dto._metadata.path).toBeDefined();
        expect(dto._metadata.repoVersion).toBeDefined();
        expect(dto._metadata.timestamp).toBeDefined();
        expect(dto._metadata.timezone).toBeDefined();
        expect(dto._metadata.version).toBeDefined();
        expect(dto._metadata.pagination).toBeDefined();
        expect(dto._metadata.pagination.search).toBeDefined();
        expect(dto._metadata.pagination.filters).toBeDefined();
        expect(dto._metadata.pagination.page).toBeDefined();
        expect(dto._metadata.pagination.perPage).toBeDefined();
        expect(dto._metadata.pagination.orderBy).toBeDefined();
        expect(dto._metadata.pagination.orderDirection).toBeDefined();
        expect(dto._metadata.pagination.availableSearch).toBeDefined();
        expect(dto._metadata.pagination.availableOrderBy).toBeDefined();
        expect(dto._metadata.pagination.availableOrderDirection).toBeDefined();
        expect(dto._metadata.pagination.total).toBeDefined();
        expect(dto._metadata.pagination.totalPage).toBeDefined();
    });
});

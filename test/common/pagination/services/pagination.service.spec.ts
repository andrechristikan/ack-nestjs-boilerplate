import { Test } from '@nestjs/testing';
import {
    DatabaseQueryContain,
    DatabaseQueryEqual,
    DatabaseQueryIn,
    DatabaseQueryNin,
    DatabaseQueryNotEqual,
    DatabaseQueryOr,
} from 'src/common/database/decorators/database.decorator';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { PaginationService } from 'src/common/pagination/services/pagination.service';

describe('PaginationService', () => {
    let service: PaginationService;

    beforeEach(async () => {
        const moduleRefRef = await Test.createTestingModule({
            providers: [PaginationService],
        }).compile();

        service = moduleRefRef.get<PaginationService>(PaginationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('offset', () => {
        it('should offset the given page and perPage', () => {
            expect(service.offset(1, 10)).toBe(0);
        });

        it('should limit the page to the maximum allowed value', () => {
            expect(service.offset(1000, 10)).toBe(190);
        });

        it('should limit the perPage to the maximum allowed value', () => {
            expect(service.offset(1, 1000)).toBe(0);
        });
    });

    describe('totalPage', () => {
        it('should calculate the total number of pages', () => {
            expect(service.totalPage(100, 10)).toBe(10);
        });

        it('should return 1 if totalData is 0', () => {
            expect(service.totalPage(0, 10)).toBe(1);
        });

        it('should limit the total number of pages to the maximum allowed value', () => {
            expect(service.totalPage(1000, 10)).toBe(20);
        });
    });

    describe('page', () => {
        it('should return the default page value if no page parameter is provided', () => {
            expect(service.page()).toBe(1);
        });

        it('should return the page 3 value', () => {
            expect(service.page(3)).toBe(3);
        });

        it('should limit the page to the maximum allowed value if a page parameter is provided', () => {
            expect(service.page(1000)).toBe(20);
        });
    });

    describe('perPage', () => {
        it('should return the default perPage value if no perPage parameter is provided', () => {
            expect(service.perPage()).toBe(20);
        });

        it('should return the 10 perPage', () => {
            expect(service.perPage(10)).toBe(10);
        });

        it('should limit the perPage to the maximum allowed value if a perPage parameter is provided', () => {
            expect(service.perPage(1000)).toBe(100);
        });
    });

    describe('order', () => {
        it('should return the order as a key-value pair', () => {
            expect(
                service.order(
                    'title',
                    ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                    ['title', 'createdAt']
                )
            ).toEqual({
                title: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
            });
        });

        it('should use the default orderBy, because of key-value not pair', () => {
            expect(
                service.order(
                    'name',
                    ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                    ['title', 'createdAt']
                )
            ).toEqual({
                createdAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
            });
        });

        it('should use the default orderBy and orderDirection values if no values are provided', () => {
            expect(service.order()).toEqual({
                createdAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
            });
        });
    });

    describe('search', () => {
        it('should return a search object based on the provided searchValue and availableSearch fields', () => {
            expect(service.search('John', ['firstName', 'lastName'])).toEqual(
                DatabaseQueryOr([
                    DatabaseQueryContain('firstName', 'John'),
                    DatabaseQueryContain('lastName', 'John'),
                ])
            );
        });

        it('should return undefined if no searchValue is provided, with undefined', () => {
            expect(
                service.search(undefined, ['firstName', 'lastName'])
            ).toBeUndefined();
        });

        it('should return undefined if no searchValue is provided, with empty string', () => {
            expect(
                service.search('', ['firstName', 'lastName'])
            ).toBeUndefined();
        });
    });

    describe('filterEqual', () => {
        it('should return a filter object for an exact match on the field', () => {
            expect(service.filterEqual('status', 'published')).toEqual(
                DatabaseQueryEqual('status', 'published')
            );
        });
    });

    describe('filterNotEqual', () => {
        it('should return a filter object for an exact not match on the field', () => {
            expect(service.filterNotEqual('status', 'published')).toEqual(
                DatabaseQueryNotEqual('status', 'published')
            );
        });
    });

    describe('filterContain', () => {
        it('should return a filter object for a partial match on the field', () => {
            expect(service.filterContain('title', 'John')).toEqual(
                DatabaseQueryContain('title', 'John')
            );
        });
    });

    describe('filterContainFullMatch', () => {
        it('should return a filter object for a full match on the field', () => {
            expect(service.filterContainFullMatch('title', 'John')).toEqual(
                DatabaseQueryContain('title', 'John', { fullWord: true })
            );
        });
    });

    describe('filterIn', () => {
        it('should return a filter object for a match in a list of possible values on the field', () => {
            expect(service.filterIn('category', ['news', 'events'])).toEqual(
                DatabaseQueryIn('category', ['news', 'events'])
            );
        });
    });

    describe('filterNin', () => {
        it('should return a filter object for a match npt in a list of possible values on the field', () => {
            expect(service.filterNin('category', ['news', 'events'])).toEqual(
                DatabaseQueryNin('category', ['news', 'events'])
            );
        });
    });

    describe('filterDate', () => {
        it('should return a filter object for a match on a date field', () => {
            const date = new Date('2020-01-01T00:00:00Z');
            expect(service.filterDate('createdAt', date)).toEqual({
                createdAt: date,
            });
        });
    });
});

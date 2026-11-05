import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { PaginationDefaultMaxPage } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationStatusCodeError } from '@common/pagination/enums/pagination.status-code.enum';
import { PaginationInvalidPageException } from '@common/pagination/exceptions/pagination.invalid-page.exception';
import { PaginationPageCannotBeLessThanOneException } from '@common/pagination/exceptions/pagination.page-cannot-be-less-than-one.exception';
import { PaginationPageExceedsMaximumException } from '@common/pagination/exceptions/pagination.page-exceeds-maximum.exception';
import { PaginationOffsetUtil } from '@common/pagination/utils/pagination.offset.util';

describe('PaginationOffsetUtil', () => {
    let util: PaginationOffsetUtil;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PaginationOffsetUtil],
        }).compile();

        util = module.get(PaginationOffsetUtil);
    });

    describe('page', () => {
        it('reports a middle page with both a next and a previous page', () => {
            const result = util.page([{ id: '1' }], 50, {
                skip: 20,
                limit: 20,
            });

            expect(result).toEqual({
                type: 'offset',
                count: 50,
                perPage: 20,
                page: 2,
                totalPage: 3,
                hasNext: true,
                hasPrevious: true,
                data: [{ id: '1' }],
                nextPage: 3,
                previousPage: 1,
            });
        });

        it('reports the first page of several with no previous page', () => {
            const result = util.page([{ id: '1' }], 50, {
                skip: 0,
                limit: 20,
            });

            expect(result).toEqual({
                type: 'offset',
                count: 50,
                perPage: 20,
                page: 1,
                totalPage: 3,
                hasNext: true,
                hasPrevious: false,
                data: [{ id: '1' }],
                nextPage: 2,
            });
        });

        it('reports the last page with no next page', () => {
            const result = util.page([{ id: '1' }], 50, {
                skip: 40,
                limit: 20,
            });

            expect(result).toEqual({
                type: 'offset',
                count: 50,
                perPage: 20,
                page: 3,
                totalPage: 3,
                hasNext: false,
                hasPrevious: true,
                data: [{ id: '1' }],
                previousPage: 2,
            });
        });

        it('reports a single empty page with no next and no previous page', () => {
            const result = util.page([], 0, {
                skip: 0,
                limit: 20,
            });

            expect(result).toEqual({
                type: 'offset',
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            });
        });
    });

    describe('skip', () => {
        it('returns zero on the first page', () => {
            expect(util.skip(1, 20)).toBe(0);
        });

        it('returns the rows before a later page', () => {
            expect(util.skip(3, 20)).toBe(40);
        });
    });

    describe('parsePage', () => {
        it('defaults to page 1 when null', () => {
            expect(util.parsePage(null)).toBe(1);
        });

        it('returns a number page', () => {
            expect(util.parsePage(PaginationDefaultMaxPage)).toBe(
                PaginationDefaultMaxPage
            );
        });

        it('parses a numeric string', () => {
            expect(util.parsePage('3')).toBe(3);
        });

        it('returns the invalid page exception for a non-integer page', () => {
            const result = util.parsePage(1.5);

            expect(result).toBeInstanceOf(PaginationInvalidPageException);
            expect(result).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidPage,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidPage
                    ],
                messagePath: 'pagination.error.invalidPage',
                messageProperties: { maxPage: PaginationDefaultMaxPage },
            });
        });

        it('returns the invalid page exception for a non-numeric page string', () => {
            const result = util.parsePage('abc');

            expect(result).toBeInstanceOf(PaginationInvalidPageException);
            expect(result).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.invalidPage,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.invalidPage
                    ],
                messagePath: 'pagination.error.invalidPage',
                messageProperties: { maxPage: PaginationDefaultMaxPage },
            });
        });

        it('returns the exceeds maximum exception for a page above the maximum', () => {
            const result = util.parsePage(PaginationDefaultMaxPage + 1);

            expect(result).toBeInstanceOf(
                PaginationPageExceedsMaximumException
            );
            expect(result).toMatchObject({
                module: 'pagination',
                statusCode: EnumPaginationStatusCodeError.pageExceedsMaximum,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.pageExceedsMaximum
                    ],
                messagePath: 'pagination.error.pageExceedsMaximum',
                messageProperties: {
                    maxPage: PaginationDefaultMaxPage,
                    receivedPage: PaginationDefaultMaxPage + 1,
                },
            });
        });

        it('returns the less than one exception for a page below one', () => {
            const result = util.parsePage(0);

            expect(result).toBeInstanceOf(
                PaginationPageCannotBeLessThanOneException
            );
            expect(result).toMatchObject({
                module: 'pagination',
                statusCode:
                    EnumPaginationStatusCodeError.pageCannotBeLessThanOne,
                statusCodeKey:
                    EnumPaginationStatusCodeError[
                        EnumPaginationStatusCodeError.pageCannotBeLessThanOne
                    ],
                messagePath: 'pagination.error.pageCannotBeLessThanOne',
                messageProperties: { minPage: 1, receivedPage: 0 },
            });
        });
    });
});

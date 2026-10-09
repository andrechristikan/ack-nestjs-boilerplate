import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import { ResponsePaginationMetadataSchema } from '@common/response/dtos/response.pagination-metadata.dto';

describe('ResponsePaginationMetadataSchema', () => {
    const base = {
        language: EnumMessageLanguage.en,
        timestamp: 1660190937231,
        timezone: 'Asia/Jakarta',
        version: '1',
        repoVersion: '1.0.0',
        requestId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
        correlationId: '01966c9a-2b8d-7000-a957-4e1c1de0c8f7',
        perPage: 20,
        hasNext: true,
        hasPrevious: false,
        orderBy: [`createdAt:${EnumPaginationOrderDirectionType.desc}`],
        availableSearch: ['name'],
        availableOrderBy: ['createdAt', 'updatedAt'],
        type: EnumPaginationType.offset,
    };

    it('parses the required cursor-shaped fields with every optional field omitted', () => {
        const result = ResponsePaginationMetadataSchema.parse(base);

        expect(result).toEqual(base);
    });

    it('parses every offset and cursor optional field alongside the base fields', () => {
        const payload = {
            ...base,
            search: 'jane',
            filters: { active: true, count: 3 },
            page: 1,
            totalPage: 5,
            count: 100,
            nextPage: 2,
            previousPage: 1,
            nextCursor: 'eyJpZCI6IjE2In0',
            previousCursor: 'eyJpZCI6IjEifQ',
        };

        const result = ResponsePaginationMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = ResponsePaginationMetadataSchema.parse({
            ...base,
            secret: 'token',
        });

        expect(result).toEqual(base);
        expect(result).not.toHaveProperty('secret');
    });

    it('rejects a missing required field', () => {
        const { perPage: _perPage, ...incomplete } = base;

        expect(() =>
            ResponsePaginationMetadataSchema.parse(incomplete)
        ).toThrow();
    });

    it('rejects a type outside the pagination enum', () => {
        expect(() =>
            ResponsePaginationMetadataSchema.parse({
                ...base,
                type: 'bogus',
            })
        ).toThrow();
    });
});

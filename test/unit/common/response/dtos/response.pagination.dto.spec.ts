import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumPaginationOrderDirectionType,
    EnumPaginationType,
} from '@common/pagination/enums/pagination.enum';
import { ResponsePaginationSchema } from '@common/response/dtos/response.pagination.dto';

describe('ResponsePaginationSchema', () => {
    const payload = {
        statusCode: 200,
        message: 'message endpoint',
        metadata: {
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
        },
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ResponsePaginationSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = ResponsePaginationSchema.parse({
            ...payload,
            data: 'leak',
        });

        expect(result).toEqual(payload);
        expect(result).not.toHaveProperty('data');
    });

    it('rejects a metadata missing the pagination-specific required fields', () => {
        const { perPage: _perPage, ...incompleteMetadata } = payload.metadata;

        expect(() =>
            ResponsePaginationSchema.parse({
                ...payload,
                metadata: incompleteMetadata,
            })
        ).toThrow();
    });
});

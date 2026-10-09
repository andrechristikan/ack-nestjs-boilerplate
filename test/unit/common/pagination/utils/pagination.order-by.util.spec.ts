import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';

describe('PaginationOrderBySchema', () => {
    const allowList = ['createdAt', 'name'] as const;
    const schema = z.strictObject({
        orderBy: PaginationOrderBySchema(allowList),
    });

    it('accepts a single field:direction string', () => {
        const result = schema.safeParse({ orderBy: 'name:asc' });

        expect(result.success).toBe(true);
    });

    it('accepts a repeated orderBy as an array', () => {
        const result = schema.safeParse({
            orderBy: ['name:asc', 'createdAt:desc'],
        });

        expect(result.success).toBe(true);
    });

    it('accepts an absent orderBy', () => {
        const result = schema.parse({});

        expect(result).toEqual({});
    });

    it('accepts an empty string so the module default order applies', () => {
        const result = schema.safeParse({ orderBy: '' });

        expect(result.success).toBe(true);
    });

    it.each([
        'foo:asc',
        'name',
        'name:',
        ':asc',
        'name:DESC',
        'Name:asc',
        'name:up',
        'name:asc:desc',
    ])('rejects the single value %s', value => {
        const result = schema.safeParse({ orderBy: value });

        expect(result.success).toBe(false);
    });

    it('rejects an array holding one invalid entry', () => {
        const result = schema.safeParse({
            orderBy: ['name:asc', 'foo:desc'],
        });

        expect(result.success).toBe(false);
    });

    it('rejects a non-string orderBy', () => {
        const result = schema.safeParse({ orderBy: 1 });

        expect(result.success).toBe(false);
    });

    it('describes the allowed fields and directions and exemplifies the first field', () => {
        const meta = schema.shape.orderBy.meta();

        expect(meta?.description).toContain(allowList.join(', '));
        expect(meta?.description).toContain(
            Object.values(EnumPaginationOrderDirectionType).join(', ')
        );
        expect(meta?.example).toBe(
            `${allowList[0]}:${EnumPaginationOrderDirectionType.desc}`
        );
    });

    it('exemplifies the first allowed field in the description', () => {
        const named = z.strictObject({
            orderBy: PaginationOrderBySchema(['name', 'createdAt'] as const),
        });

        const meta = named.shape.orderBy.meta();

        expect(meta?.description).toContain('(e.g. `name:desc`)');
    });
});

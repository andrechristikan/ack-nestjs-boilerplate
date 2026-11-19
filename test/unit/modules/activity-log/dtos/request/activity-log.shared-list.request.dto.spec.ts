import { ActivityLogSharedListRequestSchema } from '@modules/activity-log/dtos/request/activity-log.shared-list.request.dto';
import { EnumActivityLogOrderBy } from '@modules/activity-log/enums/activity-log.enum';

describe('ActivityLogSharedListRequestSchema', () => {
    it('parses cursor, perPage, and orderBy', () => {
        const result = ActivityLogSharedListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'latest',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'latest',
        });
    });

    it('parses with no field set', () => {
        const result = ActivityLogSharedListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogSharedListRequestSchema.parse({ extra: true })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            ActivityLogSharedListRequestSchema.safeParse({ search: 'x' })
                .success
        ).toBe(false);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            ActivityLogSharedListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumActivityLogOrderBy).join(', '));
    });

    it.each(Object.values(EnumActivityLogOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                ActivityLogSharedListRequestSchema.safeParse({ orderBy })
                    .success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            ActivityLogSharedListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            ActivityLogSharedListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            ActivityLogSharedListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});

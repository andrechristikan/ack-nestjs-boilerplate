import { WorkspaceJoinRequestListRequestSchema } from '@modules/workspace/dtos/request/workspace.join-request-list.request.dto';
import { EnumWorkspaceJoinRequestOrderBy } from '@modules/workspace/enums/workspace.enum';

describe('WorkspaceJoinRequestListRequestSchema', () => {
    it('parses cursor, perPage, orderBy, and status', () => {
        const result = WorkspaceJoinRequestListRequestSchema.parse({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'latest',
            status: 'pending',
        });

        expect(result).toEqual({
            cursor: 'eyJpZCI6IjE2In0',
            perPage: 20,
            orderBy: 'latest',
            status: 'pending',
        });
    });

    it('parses with no field set', () => {
        const result = WorkspaceJoinRequestListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        const result = WorkspaceJoinRequestListRequestSchema.safeParse({
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects search', () => {
        expect(
            WorkspaceJoinRequestListRequestSchema.safeParse({ search: 'x' })
                .error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts a status of 256 characters and rejects one of 257', () => {
        expect(() =>
            WorkspaceJoinRequestListRequestSchema.parse({
                status: 'a'.repeat(256),
            })
        ).not.toThrow();
        const result = WorkspaceJoinRequestListRequestSchema.safeParse({
            status: 'a'.repeat(257),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['status'], code: 'too_big' }),
        ]);
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            WorkspaceJoinRequestListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumWorkspaceJoinRequestOrderBy).join(', '));
    });

    it.each(Object.values(EnumWorkspaceJoinRequestOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                WorkspaceJoinRequestListRequestSchema.safeParse({ orderBy })
                    .success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            WorkspaceJoinRequestListRequestSchema.safeParse({ orderBy: '' })
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
            WorkspaceJoinRequestListRequestSchema.safeParse({ orderBy }).error
                ?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            WorkspaceJoinRequestListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });
});

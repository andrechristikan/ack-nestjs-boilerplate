import { WorkspaceUpdateIsPublicRequestSchema } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';

describe('WorkspaceUpdateIsPublicRequestSchema', () => {
    const payload = { isPublic: true };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceUpdateIsPublicRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a non-boolean isPublic', () => {
        const result = WorkspaceUpdateIsPublicRequestSchema.safeParse({
            isPublic: 'true',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['isPublic'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = WorkspaceUpdateIsPublicRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});

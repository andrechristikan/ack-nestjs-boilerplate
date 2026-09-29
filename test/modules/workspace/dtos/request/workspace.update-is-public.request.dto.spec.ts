import { WorkspaceUpdateIsPublicRequestSchema } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';

describe('WorkspaceUpdateIsPublicRequestSchema', () => {
    const payload = { isPublic: true };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceUpdateIsPublicRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a non-boolean isPublic', () => {
        expect(() =>
            WorkspaceUpdateIsPublicRequestSchema.parse({ isPublic: 'true' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceUpdateIsPublicRequestSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });
});

import { WorkspaceJoinRequestCreateRequestSchema } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';

describe('WorkspaceJoinRequestCreateRequestSchema', () => {
    const payload = {
        workspaceId: '507f1f77bcf86cd799439011',
        message: 'Please let me in',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceJoinRequestCreateRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses with only the required workspaceId', () => {
        const result = WorkspaceJoinRequestCreateRequestSchema.parse({
            workspaceId: payload.workspaceId,
        });

        expect(result).toEqual({ workspaceId: payload.workspaceId });
    });

    it('rejects a workspaceId that is not a MongoID', () => {
        const result = WorkspaceJoinRequestCreateRequestSchema.safeParse({
            ...payload,
            workspaceId: 'not-an-id',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['workspaceId'],
                code: 'too_small',
            }),
            expect.objectContaining({
                path: ['workspaceId'],
                code: 'invalid_format',
            }),
        ]);
    });

    it('rejects a message over 500 characters', () => {
        const result = WorkspaceJoinRequestCreateRequestSchema.safeParse({
            ...payload,
            message: 'a'.repeat(501),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['message'], code: 'too_big' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = WorkspaceJoinRequestCreateRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});

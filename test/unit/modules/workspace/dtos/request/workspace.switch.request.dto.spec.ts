import { WorkspaceSwitchRequestSchema } from '@modules/workspace/dtos/request/workspace.switch.request.dto';

describe('WorkspaceSwitchRequestSchema', () => {
    const payload = { workspaceId: '507f1f77bcf86cd799439011' };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceSwitchRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a workspaceId that is not a MongoID', () => {
        const result = WorkspaceSwitchRequestSchema.safeParse({
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

    it('rejects an undeclared key', () => {
        const result = WorkspaceSwitchRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});

import { WorkspaceSwitchRequestSchema } from '@modules/workspace/dtos/request/workspace.switch.request.dto';

describe('WorkspaceSwitchRequestSchema', () => {
    const payload = { workspaceId: '507f1f77bcf86cd799439011' };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceSwitchRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a workspaceId that is not a MongoID', () => {
        expect(() =>
            WorkspaceSwitchRequestSchema.parse({ workspaceId: 'not-an-id' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceSwitchRequestSchema.parse({ ...payload, extra: true })
        ).toThrow();
    });
});

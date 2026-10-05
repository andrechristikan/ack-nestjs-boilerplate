import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';
import { RoleSchema } from '@modules/role/dtos/role.dto';

describe('RoleSchema', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const policy = {
        id: 'policy-1',
        createdAt,
        createdBy: 'user-1',
        updatedAt,
        updatedBy: 'user-1',
        subject: EnumPolicySubject.role,
        action: [EnumPolicyAction.manage],
    };
    const row = {
        id: 'role-1',
        createdAt,
        createdBy: 'user-1',
        updatedAt,
        updatedBy: 'user-1',
        name: 'manager',
        description: 'Team lead role',
        type: EnumRoleType.admin,
        policies: [policy],
    };

    it('parses a row into exactly the declared fields', () => {
        const result = RoleSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a null description and an empty policies array', () => {
        const result = RoleSchema.parse({
            ...row,
            description: null,
            policies: [],
        });

        expect(result).toEqual({ ...row, description: null, policies: [] });
    });

    it('rejects a description over 500 characters', () => {
        expect(() =>
            RoleSchema.parse({ ...row, description: 'a'.repeat(501) })
        ).toThrow();
    });

    it('strips deletedAt, deletedBy, and any other undeclared key', () => {
        const result = RoleSchema.parse({
            ...row,
            deletedAt: null,
            deletedBy: null,
            secret: 'ignored',
        });

        expect(result).toEqual(row);
    });
});

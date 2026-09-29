import { UserTwoFactorSchema } from '@modules/user/dtos/user.two-factor.dto';

describe('UserTwoFactorSchema', () => {
    const confirmedAt = new Date('2026-01-03T00:00:00.000Z');

    const row = {
        id: 'two-factor-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        userId: 'user-1',
        enabled: true,
        requiredSetup: false,
        confirmedAt,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = UserTwoFactorSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a null confirmedAt', () => {
        const result = UserTwoFactorSchema.parse({
            ...row,
            confirmedAt: null,
        });

        expect(result).toEqual({ ...row, confirmedAt: null });
    });

    it('strips deletedAt and deletedBy inherited from DatabaseResponseSchema', () => {
        const result = UserTwoFactorSchema.parse({
            ...row,
            deletedAt: null,
            deletedBy: null,
        });

        expect(result).toEqual(row);
    });

    it('strips two-factor secret material', () => {
        const result = UserTwoFactorSchema.parse({
            ...row,
            secret: 'encrypted-secret',
            pendingSecret: 'encrypted-pending-secret',
            backupCodes: ['hash-one', 'hash-two'],
            attempt: 2,
            lastUsedAt: new Date('2026-01-04T00:00:00.000Z'),
        });

        expect(result).toEqual(row);
        expect(result).not.toHaveProperty('secret');
        expect(result).not.toHaveProperty('pendingSecret');
        expect(result).not.toHaveProperty('backupCodes');
        expect(result).not.toHaveProperty('attempt');
        expect(result).not.toHaveProperty('lastUsedAt');
    });
});

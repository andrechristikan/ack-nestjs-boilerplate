import { AnalyticBackupCodeNewDeviceResponseSchema } from '@modules/analytic/dtos/response/analytic.backup-code-new-device.response.dto';

describe('AnalyticBackupCodeNewDeviceResponseSchema', () => {
    const regeneratedAt = new Date('2026-01-02T03:04:05.000Z');

    const row = {
        userId: 'user-1',
        regeneratedAt,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticBackupCodeNewDeviceResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('rejects a regeneratedAt that is not a Date', () => {
        expect(() =>
            AnalyticBackupCodeNewDeviceResponseSchema.parse({
                ...row,
                regeneratedAt: regeneratedAt.toISOString(),
            })
        ).toThrow();
    });

    it('strips an undeclared key', () => {
        const result = AnalyticBackupCodeNewDeviceResponseSchema.parse({
            ...row,
            backupCodes: ['code-1'],
        });

        expect(result).toEqual(row);
    });
});

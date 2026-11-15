import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { DeviceRemoveRequestSchema } from '@modules/device/dtos/request/device.remove.request.dto';

describe('DeviceRemoveRequestSchema', () => {
    const payload = {
        password: 'Current-pass1',
        method: EnumAuthTwoFactorMethod.code,
        code: '654321',
        backupCode: 'ABCD1234EF',
        otp: '123456',
    };

    it('parses the re-authentication fields into exactly the declared fields', () => {
        const result = DeviceRemoveRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('accepts an empty payload', () => {
        const result = DeviceRemoveRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an empty password', () => {
        expect(() =>
            DeviceRemoveRequestSchema.parse({ password: '' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            DeviceRemoveRequestSchema.parse({
                ...payload,
                challengeToken: 'c07c5f0d6d0c4c6db1f6a6d38f5ce8fa',
            })
        ).toThrow();
    });
});

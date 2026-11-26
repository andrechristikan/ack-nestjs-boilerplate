import {
    EnumDevicePlatform,
    EnumUserLoginFrom,
} from '@generated/prisma-client/client';
import { UserCreateSocialRequestSchema } from '@modules/user/dtos/request/user.create-social.request.dto';

describe('UserCreateSocialRequestSchema', () => {
    const payload = {
        username: 'developer123',
        name: 'john doe',
        countryId: '507f1f77bcf86cd799439012',
        marketing: true,
        cookies: true,
        inviteToken: 'a1b2c3d4e5',
        from: EnumUserLoginFrom.website,
        device: {
            fingerprint: 'abc123def456ghi789jkl012mno345pq',
            name: "John's iPhone",
            platform: EnumDevicePlatform.ios,
            notificationToken: 'fcm-token-1',
        },
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserCreateSocialRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('trims and lower-cases the name inherited from the create schema', () => {
        const result = UserCreateSocialRequestSchema.parse({
            ...payload,
            name: '  John DOE  ',
        });

        expect(result.name).toBe('john doe');
    });

    it('rejects an undeclared email key', () => {
        const result = UserCreateSocialRequestSchema.safeParse({
            ...payload,
            email: 'john.doe@example.com',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects an undeclared password key', () => {
        const result = UserCreateSocialRequestSchema.safeParse({
            ...payload,
            password: 'abcDE12345@@!',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});

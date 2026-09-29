import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { SessionResponseSchema } from '@modules/session/dtos/response/session.response.dto';

describe('SessionResponseSchema', () => {
    const photo = {
        bucket: 'BUCKET',
        key: '/uploads/photo.jpg',
        cdnUrl: 'https://cdn.example.com/uploads/photo.jpg',
        completedUrl: 'https://cdn.example.com/uploads/photo.jpg',
        mime: 'image/jpeg',
        extension: 'jpg',
        access: EnumAwsS3Accessibility.public,
    };
    const userRef = {
        id: 'user-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-0',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-0',
        deletedAt: null,
        deletedBy: null,
        name: 'Ada Lovelace',
        username: 'ada',
        photo,
    };
    const userAgent = {
        ua: 'Mozilla/5.0',
        browser: {
            name: 'Chrome',
            version: '112.0.5615.49',
            major: '112',
            type: 'mobile',
        },
        cpu: { architecture: 'amd64' },
        device: { type: 'mobile', vendor: 'Apple', model: 'iPhone' },
        engine: { name: 'WebKit', version: '537.36' },
        os: { name: 'iOS', version: '16.3.1' },
    };
    const geoLocation = {
        latitude: 1,
        longitude: 2,
        country: 'US',
        region: 'CA',
        city: 'San Francisco',
    };
    const session = {
        id: 'session-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        userId: 'user-1',
        user: userRef,
        deviceOwnershipId: 'device-ownership-1',
        ipAddress: '127.0.0.1',
        userAgent,
        geoLocation,
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        revokedBy: null,
    };

    it('parses a session into exactly the declared fields', () => {
        const result = SessionResponseSchema.parse(session);

        expect(result).toEqual(session);
    });

    it('parses a nullable ipAddress, geoLocation, revokedAt, revokedById and revokedBy', () => {
        const revokedSession = {
            ...session,
            ipAddress: null,
            geoLocation: null,
            revokedAt: new Date('2026-01-03T00:00:00.000Z'),
            isRevoked: true,
            revokedById: 'user-2',
            revokedBy: userRef,
        };

        const result = SessionResponseSchema.parse(revokedSession);

        expect(result).toEqual(revokedSession);
    });

    it('strips an undeclared key and the omitted soft-delete fields', () => {
        const result = SessionResponseSchema.parse({
            ...session,
            deletedAt: null,
            deletedBy: null,
            jti: 'jti-value',
        });

        expect(result).toEqual(session);
    });
});

import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { EnumDevicePlatform } from '@generated/prisma-client/client';
import { DeviceUtil } from '@modules/device/utils/device.util';

describe('DeviceUtil', () => {
    let util: DeviceUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [DeviceUtil],
        }).compile();

        util = module.get(DeviceUtil);
    });

    describe('toIdentity', () => {
        it('maps every absent optional field to null', () => {
            expect(
                util.toIdentity({
                    fingerprint: 'abc123def456ghi789jkl012mno345pq',
                    platform: EnumDevicePlatform.web,
                })
            ).toEqual({
                fingerprint: 'abc123def456ghi789jkl012mno345pq',
                name: null,
                platform: EnumDevicePlatform.web,
                notificationToken: null,
            });
        });

        it('forwards the optional device fields when present', () => {
            expect(
                util.toIdentity({
                    fingerprint: 'abc123def456ghi789jkl012mno345pq',
                    name: 'iPhone 12',
                    platform: EnumDevicePlatform.ios,
                    notificationToken: 'token-1',
                })
            ).toEqual({
                fingerprint: 'abc123def456ghi789jkl012mno345pq',
                name: 'iPhone 12',
                platform: EnumDevicePlatform.ios,
                notificationToken: 'token-1',
            });
        });
    });
});

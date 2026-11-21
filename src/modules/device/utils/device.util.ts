import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import type { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
import type {
    IDeviceIdentity,
    IDeviceOwnership,
} from '@modules/device/interfaces/device.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceUtil {
    toIdentity(device: DeviceRequestDto): IDeviceIdentity {
        return {
            fingerprint: device.fingerprint,
            name: device.name ?? null,
            platform: device.platform,
            notificationToken: device.notificationToken ?? null,
        };
    }

    isOwnedByOther(userId: string, actorUserId: string): boolean {
        return userId !== actorUserId;
    }

    mapActivityLogMetadata(
        deviceOwnership: IDeviceOwnership,
        sessionCount: number
    ): IActivityLogMetadata {
        return {
            deviceOwnershipId: deviceOwnership.id,
            deviceId: deviceOwnership.device.id,
            sessionCount,
        };
    }

    mapActivityLogActorMetadata(
        deviceOwnership: IDeviceOwnership,
        sessionCount: number
    ): IActivityLogMetadata {
        const metadata = this.mapActivityLogMetadata(
            deviceOwnership,
            sessionCount
        );

        return {
            ...metadata,
            targetUserId: deviceOwnership.userId,
            targetUsername: deviceOwnership.user.username,
            timestamp: deviceOwnership.updatedAt,
        };
    }

    mapActivityLogTargetMetadata(
        deviceOwnership: IDeviceOwnership,
        actorUserId: string,
        sessionCount: number
    ): IActivityLogMetadata {
        const metadata = this.mapActivityLogMetadata(
            deviceOwnership,
            sessionCount
        );

        return {
            ...metadata,
            actorUserId,
            timestamp: deviceOwnership.updatedAt,
        };
    }
}

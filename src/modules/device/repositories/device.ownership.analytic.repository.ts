import { DatabaseService } from '@common/database/services/database.service';
import type { IAnalyticSharedFingerprint } from '@modules/analytic/interfaces/analytic.fraud.interface';
import type {
    IDeviceOwnershipAnalyticCreated,
    IDeviceOwnershipAnalyticInactive,
    IDeviceOwnershipAnalyticUserCount,
} from '@modules/device/interfaces/device.interface';
import type { IDeviceOwnershipAnalyticRepository } from '@modules/device/interfaces/device.ownership-analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceOwnershipAnalyticRepository implements IDeviceOwnershipAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async countOwnerships(): Promise<number> {
        return this.databaseService.client.deviceOwnership.count({
            where: { isRevoked: false },
        });
    }

    async countPerUser(): Promise<IDeviceOwnershipAnalyticUserCount[]> {
        const rows = await this.databaseService.client.deviceOwnership.groupBy({
            by: ['userId'],
            where: { isRevoked: false },
            _count: { _all: true },
        });
        return rows.map(r => ({ userId: r.userId, count: r._count._all }));
    }

    async findInactive(
        before: Date
    ): Promise<IDeviceOwnershipAnalyticInactive[]> {
        return this.databaseService.client.deviceOwnership.findMany({
            where: {
                isRevoked: false,
                lastActiveAt: { lt: before },
            },
            select: {
                id: true,
                userId: true,
                lastActiveAt: true,
                deviceId: true,
            },
        });
    }

    async findCreatedInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IDeviceOwnershipAnalyticCreated[]> {
        return this.databaseService.client.deviceOwnership.findMany({
            where: {
                createdAt: { gte: startDate, lt: endDate },
            },
            select: {
                id: true,
                userId: true,
                deviceId: true,
                createdAt: true,
            },
        });
    }

    async sharedFingerprints(
        minUsers: number
    ): Promise<IAnalyticSharedFingerprint[]> {
        const ownerships =
            await this.databaseService.client.deviceOwnership.findMany({
                where: { isRevoked: false },
                select: {
                    userId: true,
                    device: { select: { fingerprint: true } },
                },
            });
        const map = new Map<string, Set<string>>();
        for (const o of ownerships) {
            const fp = o.device.fingerprint;
            if (!map.has(fp)) {
                map.set(fp, new Set());
            }
            map.get(fp)!.add(o.userId);
        }
        return [...map.entries()]
            .filter(([, users]) => users.size >= minUsers)
            .map(([fingerprint, users]) => ({
                fingerprint,
                userCount: users.size,
                userIds: [...users],
            }));
    }
}

import { DatabaseService } from '@common/database/services/database.service';
import type { IAnalyticSharedFingerprint } from '@modules/analytic/interfaces/analytic.fraud.interface';
import type {
    IDeviceOwnershipAnalyticCreated,
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

    async countInactive(before: Date): Promise<number> {
        return this.databaseService.client.deviceOwnership.count({
            where: {
                isRevoked: false,
                lastActiveAt: { lt: before },
            },
        });
    }

    async findCreatedInRangeByUser(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IDeviceOwnershipAnalyticCreated[]> {
        return this.databaseService.client.deviceOwnership.findMany({
            where: {
                userId,
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

    async findSharedFingerprints(
        minUsers: number
    ): Promise<IAnalyticSharedFingerprint[]> {
        const shared =
            await this.databaseService.client.deviceOwnership.groupBy({
                by: ['deviceId'],
                where: { isRevoked: false },
                having: { userId: { _count: { gte: minUsers } } },
                _count: { _all: true },
            });
        if (shared.length === 0) {
            return [];
        }

        const ownerships =
            await this.databaseService.client.deviceOwnership.findMany({
                where: {
                    isRevoked: false,
                    deviceId: { in: shared.map(row => row.deviceId) },
                },
                select: {
                    userId: true,
                    device: { select: { fingerprint: true } },
                },
            });
        const map = new Map<string, Set<string>>();
        for (const ownership of ownerships) {
            const fingerprint = ownership.device.fingerprint;
            const users = map.get(fingerprint) ?? new Set<string>();
            users.add(ownership.userId);
            map.set(fingerprint, users);
        }

        return [...map.entries()].map(([fingerprint, users]) => ({
            fingerprint,
            userCount: users.size,
            userIds: [...users],
        }));
    }
}

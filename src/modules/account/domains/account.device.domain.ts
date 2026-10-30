import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IAccountDeviceRemoveResult } from '@modules/account/interfaces/account.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountDeviceDomain {
    constructor(
        private readonly deviceDomain: DeviceDomain,
        private readonly sessionDomain: SessionDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    private async removeRevokedBy(
        userId: string,
        deviceOwnershipId: string,
        removedBy: string
    ): Promise<IAccountDeviceRemoveResult> {
        // Sequential by design: gate before the work it guards
        await this.deviceDomain.assertActive(userId, deviceOwnershipId);
        const now = this.helperDateService.create();

        try {
            return await this.databaseService.withTransaction(async tx => {
                const revokedSessions =
                    await this.sessionDomain.revokeByDeviceOwnershipInTx(
                        tx,
                        userId,
                        deviceOwnershipId,
                        removedBy,
                        now
                    );
                const deviceOwnership =
                    await this.deviceDomain.removeOwnershipInTx(
                        tx,
                        userId,
                        deviceOwnershipId,
                        removedBy,
                        now
                    );

                return { deviceOwnership, revokedSessions };
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async remove(
        userId: string,
        deviceOwnershipId: string
    ): Promise<IAccountDeviceRemoveResult> {
        return this.removeRevokedBy(userId, deviceOwnershipId, userId);
    }

    async removeByAdmin(
        userId: string,
        deviceOwnershipId: string,
        removedBy: string
    ): Promise<IAccountDeviceRemoveResult> {
        return this.removeRevokedBy(userId, deviceOwnershipId, removedBy);
    }
}

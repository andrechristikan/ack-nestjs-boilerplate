import { DatabaseRecordNotFoundCode } from '@common/database/constants/database.constant';
import type { IDatabaseErrorContract } from '@common/database/interfaces/database.interface';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';

/** @public */
export const DeviceOwnershipDatabaseErrorContract = {
    [DatabaseRecordNotFoundCode]: DeviceNotFoundException,
} satisfies IDatabaseErrorContract;

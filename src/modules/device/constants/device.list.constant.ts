import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationOrderByPresets } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client/client';
import {
    EnumDeviceCursorOrderBy,
    EnumDeviceOrderBy,
} from '@modules/device/enums/device.enum';

/** @public */
export const DeviceOrderBy = {
    [EnumDeviceOrderBy.latest]: [
        {
            [Prisma.DeviceOwnershipScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
    [EnumDeviceOrderBy.recentlyActive]: [
        {
            [Prisma.DeviceOwnershipScalarFieldEnum.lastActiveAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.DeviceOwnershipScalarFieldEnum,
    EnumDeviceOrderBy
>;

/** @public */
export const DeviceCursorOrderBy = {
    [EnumDeviceCursorOrderBy.latest]: [
        {
            [Prisma.DeviceOwnershipScalarFieldEnum.createdAt]:
                EnumPaginationOrderDirectionType.desc,
        },
    ],
} as const satisfies IPaginationOrderByPresets<
    Prisma.DeviceOwnershipScalarFieldEnum,
    EnumDeviceCursorOrderBy
>;

/** @public */
export const DeviceSharedListCursorScope = 'DeviceSharedListCursorScope';

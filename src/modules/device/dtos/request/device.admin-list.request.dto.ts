import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';
import { EnumDeviceOrderBy } from '@modules/device/enums/device.enum';

/** @public */
export const DeviceAdminListRequestSchema = PaginationOffsetQuerySchema.omit({
    search: true,
}).extend({
    orderBy: z
        .union([z.enum(EnumDeviceOrderBy), z.literal('')])
        .optional()
        .meta({
            description: `Sort preset name. Available presets: ${Object.values(EnumDeviceOrderBy).join(', ')}. An empty or absent value uses \`${EnumDeviceOrderBy.latest}\`.`,
            example: EnumDeviceOrderBy.latest,
        }),
    isRevoked: RequestBooleanStringSchema.optional().meta({
        description: "Filter by revoked ownership: 'true' or 'false'",
        example: 'true',
    }),
});

/** @public */
export type DeviceAdminListRequestDto = z.infer<
    typeof DeviceAdminListRequestSchema
>;

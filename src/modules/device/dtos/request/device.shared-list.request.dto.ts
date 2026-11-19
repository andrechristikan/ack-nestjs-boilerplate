import { z } from 'zod';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { EnumDeviceCursorOrderBy } from '@modules/device/enums/device.enum';

/** @public */
export const DeviceSharedListRequestSchema = PaginationCursorQuerySchema.omit({
    search: true,
}).extend({
    orderBy: z
        .union([z.enum(EnumDeviceCursorOrderBy), z.literal('')])
        .optional()
        .meta({
            description: `Sort preset name. Available presets: ${Object.values(EnumDeviceCursorOrderBy).join(', ')}. An empty or absent value uses \`${EnumDeviceCursorOrderBy.latest}\`.`,
            example: EnumDeviceCursorOrderBy.latest,
        }),
});

/** @public */
export type DeviceSharedListRequestDto = z.infer<
    typeof DeviceSharedListRequestSchema
>;

import { z } from 'zod';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { EnumSessionCursorOrderBy } from '@modules/session/enums/session.enum';

/** @public */
export const SessionSharedListRequestSchema = PaginationCursorQuerySchema.omit({
    search: true,
}).extend({
    orderBy: z
        .union([z.enum(EnumSessionCursorOrderBy), z.literal('')])
        .optional()
        .meta({
            description: `Sort preset name. Available presets: ${Object.values(EnumSessionCursorOrderBy).join(', ')}. An empty or absent value uses \`${EnumSessionCursorOrderBy.latest}\`.`,
            example: EnumSessionCursorOrderBy.latest,
        }),
});

/** @public */
export type SessionSharedListRequestDto = z.infer<
    typeof SessionSharedListRequestSchema
>;

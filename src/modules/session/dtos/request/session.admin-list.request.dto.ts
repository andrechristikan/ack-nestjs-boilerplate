import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';
import { EnumSessionOrderBy } from '@modules/session/enums/session.enum';

/** @public */
export const SessionAdminListRequestSchema = PaginationOffsetQuerySchema.omit({
    search: true,
}).extend({
    orderBy: z
        .union([z.enum(EnumSessionOrderBy), z.literal('')])
        .optional()
        .meta({
            description: `Sort preset name. Available presets: ${Object.values(EnumSessionOrderBy).join(', ')}. An empty or absent value uses \`${EnumSessionOrderBy.latest}\`.`,
            example: EnumSessionOrderBy.latest,
        }),
    isRevoked: RequestBooleanStringSchema.optional().meta({
        description: "Filter by revoked session: 'true' or 'false'",
        example: 'true',
    }),
});

/** @public */
export type SessionAdminListRequestDto = z.infer<
    typeof SessionAdminListRequestSchema
>;

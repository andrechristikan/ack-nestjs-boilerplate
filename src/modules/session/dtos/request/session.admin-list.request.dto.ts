import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';
import { SessionDefaultAvailableOrderBy } from '@modules/session/constants/session.list.constant';

/**
 * Offset list query for admin session listing.
 * @public
 */
export const SessionAdminListRequestSchema = PaginationOffsetQuerySchema.omit({
    search: true,
}).extend({
    orderBy: PaginationOrderBySchema(SessionDefaultAvailableOrderBy),
    isRevoked: RequestBooleanStringSchema.optional().meta({
        description: "Filter by revoked session: 'true' or 'false'",
        example: 'true',
    }),
});

/**
 * Inferred DTO for SessionAdminListRequestSchema.
 * @public
 */
export type SessionAdminListRequestDto = z.infer<
    typeof SessionAdminListRequestSchema
>;

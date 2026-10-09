import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { SessionCursorAvailableOrderBy } from '@modules/session/constants/session.list.constant';

/**
 * Session Shared List Request schema for paginated list query.
 * @public
 */
export const SessionSharedListRequestSchema = PaginationCursorQuerySchema.omit({
    search: true,
}).extend({
    orderBy: PaginationOrderBySchema(SessionCursorAvailableOrderBy),
});

/**
 * Inferred DTO for SessionSharedListRequestSchema.
 * @public
 */
export type SessionSharedListRequestDto = z.infer<
    typeof SessionSharedListRequestSchema
>;

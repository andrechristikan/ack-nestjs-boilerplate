import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import { ProjectMemberDefaultAvailableOrderBy } from '@modules/project/constants/project.list.constant';

/**
 * Project Member List Request schema for paginated list query.
 * @public
 */
export const ProjectMemberListRequestSchema = PaginationCursorQuerySchema.omit({
    search: true,
}).extend({
    orderBy: PaginationOrderBySchema(ProjectMemberDefaultAvailableOrderBy),
});

/**
 * Inferred DTO for ProjectMemberListRequestSchema.
 * @public
 */
export type ProjectMemberListRequestDto = z.infer<
    typeof ProjectMemberListRequestSchema
>;

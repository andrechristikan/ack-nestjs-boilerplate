import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationCursorQuerySchema } from '@common/pagination/dtos/pagination.cursor-query.dto';
import {
    ProjectCursorAvailableOrderBy,
    ProjectDefaultAvailableSearch,
} from '@modules/project/constants/project.list.constant';

/**
 * Project User List Request schema for paginated list query.
 * @public
 */
export const ProjectUserListRequestSchema = PaginationCursorQuerySchema.extend({
    search: PaginationCursorQuerySchema.shape.search.meta({
        description: `Search query, available fields: ${ProjectDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
        example: '',
    }),
    orderBy: PaginationOrderBySchema(ProjectCursorAvailableOrderBy),
});

/**
 * Inferred DTO for ProjectUserListRequestSchema.
 * @public
 */
export type ProjectUserListRequestDto = z.infer<
    typeof ProjectUserListRequestSchema
>;

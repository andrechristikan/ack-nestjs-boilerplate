import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import {
    ProjectDefaultAvailableOrderBy,
    ProjectDefaultAvailableSearch,
} from '@modules/project/constants/project.list.constant';
import { faker } from '@faker-js/faker';

/**
 * Offset list query for admin project listing.
 * @public
 */
export const ProjectAdminListRequestSchema = PaginationOffsetQuerySchema.extend(
    {
        search: PaginationOffsetQuerySchema.shape.search.meta({
            description: `Search query, available fields: ${ProjectDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
        orderBy: PaginationOrderBySchema(ProjectDefaultAvailableOrderBy),
        workspaceId: RequestMongoIdSchema.optional().meta({
            description: 'Filter by workspaceId',
            example: faker.database.mongodbObjectId(),
        }),
    }
);

/**
 * Inferred DTO for ProjectAdminListRequestSchema.
 * @public
 */
export type ProjectAdminListRequestDto = z.infer<
    typeof ProjectAdminListRequestSchema
>;

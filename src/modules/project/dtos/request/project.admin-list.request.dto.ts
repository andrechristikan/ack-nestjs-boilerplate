import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
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
        search: z
            .string()
            .optional()
            .meta({
                description: `Search query, available fields: ${ProjectDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
                example: '',
            }),
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${ProjectDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${ProjectDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
        workspaceId: RequestUuidSchema.optional().meta({
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

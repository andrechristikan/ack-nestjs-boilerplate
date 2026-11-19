import { z } from 'zod';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import { ProjectDefaultAvailableSearch } from '@modules/project/constants/project.list.constant';
import { faker } from '@faker-js/faker';
import { EnumProjectOrderBy } from '@modules/project/enums/project.enum';

/** @public */
export const ProjectAdminListRequestSchema = PaginationOffsetQuerySchema.extend(
    {
        search: PaginationOffsetQuerySchema.shape.search.meta({
            description: `Search query, available fields: ${ProjectDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
            example: '',
        }),
        orderBy: z
            .union([z.enum(EnumProjectOrderBy), z.literal('')])
            .optional()
            .meta({
                description: `Sort preset name. Available presets: ${Object.values(EnumProjectOrderBy).join(', ')}. An empty or absent value uses \`${EnumProjectOrderBy.latest}\`.`,
                example: EnumProjectOrderBy.latest,
            }),
        workspaceId: RequestMongoIdSchema.optional().meta({
            description: 'Filter by workspaceId',
            example: faker.database.mongodbObjectId(),
        }),
    }
);

/** @public */
export type ProjectAdminListRequestDto = z.infer<
    typeof ProjectAdminListRequestSchema
>;

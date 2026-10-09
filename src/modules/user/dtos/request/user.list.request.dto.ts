import { z } from 'zod';
import { PaginationOrderBySchema } from '@common/pagination/utils/pagination.order-by.util';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import {
    UserDefaultAvailableOrderBy,
    UserDefaultAvailableSearch,
} from '@modules/user/constants/user.list.constant';
import { faker } from '@faker-js/faker';
import { EnumUserStatus } from '@generated/prisma-client/client';

/**
 * Offset list query for admin user listing.
 * @public
 */
export const UserListRequestSchema = PaginationOffsetQuerySchema.extend({
    search: PaginationOffsetQuerySchema.shape.search.meta({
        description: `Search query, available fields: ${UserDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
        example: '',
    }),
    orderBy: PaginationOrderBySchema(UserDefaultAvailableOrderBy),
    status: z
        .string()
        .optional()
        .meta({
            description: "value with ',' delimiter",
            example: Object.values(EnumUserStatus).join(','),
        }),
    roleId: RequestMongoIdSchema.optional().meta({
        description: 'Filter by roleId',
        example: faker.database.mongodbObjectId(),
    }),
    countryId: RequestMongoIdSchema.optional().meta({
        description: 'Filter by countryId',
        example: faker.database.mongodbObjectId(),
    }),
});

/**
 * Inferred DTO for UserListRequestSchema.
 * @public
 */
export type UserListRequestDto = z.infer<typeof UserListRequestSchema>;

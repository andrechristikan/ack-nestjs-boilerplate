import { z } from 'zod';
import { PaginationMaxFilterLength } from '@common/pagination/constants/pagination.constant';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestMongoIdSchema } from '@common/request/validations/request.mongo-id.validation';
import { UserDefaultAvailableSearch } from '@modules/user/constants/user.list.constant';
import { faker } from '@faker-js/faker';
import { EnumUserStatus } from '@generated/prisma-client/client';
import { EnumUserOrderBy } from '@modules/user/enums/user.enum';

/** @public */
export const UserListRequestSchema = PaginationOffsetQuerySchema.extend({
    search: PaginationOffsetQuerySchema.shape.search.meta({
        description: `Search query, available fields: ${UserDefaultAvailableSearch.join(', ')}. Search is case-insensitive and support partial match.`,
        example: '',
    }),
    orderBy: z
        .union([z.enum(EnumUserOrderBy), z.literal('')])
        .optional()
        .meta({
            description: `Sort preset name. Available presets: ${Object.values(EnumUserOrderBy).join(', ')}. An empty or absent value uses \`${EnumUserOrderBy.latest}\`.`,
            example: EnumUserOrderBy.latest,
        }),
    status: z
        .string()
        .max(PaginationMaxFilterLength)
        .optional()
        .meta({
            description: `value with ',' delimiter, at most ${PaginationMaxFilterLength} characters`,
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

/** @public */
export type UserListRequestDto = z.infer<typeof UserListRequestSchema>;

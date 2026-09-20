import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { PaginationOffsetQuerySchema } from '@common/pagination/dtos/pagination.offset-query.dto';
import { RequestBooleanStringSchema } from '@common/request/validations/request.boolean-string.validation';
import { SessionDefaultAvailableOrderBy } from '@modules/session/constants/session.list.constant';

/**
 * Offset list query for admin session listing.
 * @public
 */
export const SessionAdminListRequestSchema = PaginationOffsetQuerySchema.extend(
    {
        orderBy: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .meta({
                description: `Order by field in \`field:direction\` format (e.g. \`createdAt:desc\`). Available fields: ${SessionDefaultAvailableOrderBy.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
                example: `${SessionDefaultAvailableOrderBy[0]}:${EnumPaginationOrderDirectionType.desc}`,
            }),
        isRevoked: RequestBooleanStringSchema.optional().meta({
            description: "Filter by revoked session: 'true' or 'false'",
            example: 'true',
        }),
    }
);

/**
 * Inferred DTO for SessionAdminListRequestSchema.
 * @public
 */
export type SessionAdminListRequestDto = z.infer<
    typeof SessionAdminListRequestSchema
>;

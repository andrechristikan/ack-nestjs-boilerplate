import { z } from 'zod';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';

/**
 * Builds the `orderBy` query schema of a list DTO from its allow-list: one `field:direction` string, an array of
 * them, or an empty string that leaves the module default order. Field and direction are case-sensitive.
 */
export function PaginationOrderBySchema<
    const TAllowList extends readonly [string, ...string[]],
>(
    allowList: TAllowList
): z.ZodOptional<
    z.ZodType<
        | `${TAllowList[number]}:${EnumPaginationOrderDirectionType}`
        | `${TAllowList[number]}:${EnumPaginationOrderDirectionType}`[]
        | ''
    >
> {
    const entry = z.templateLiteral([
        z.enum(allowList),
        ':',
        z.enum(EnumPaginationOrderDirectionType),
    ]);

    return z
        .union([entry, z.array(entry), z.literal('')])
        .optional()
        .meta({
            description: `Order by field in \`field:direction\` format (e.g. \`${allowList[0]}:desc\`). Available fields: ${allowList.join(', ')}. Available directions: ${Object.values(EnumPaginationOrderDirectionType).join(', ')}. Repeat the parameter to sort by multiple fields.`,
            example: `${allowList[0]}:${EnumPaginationOrderDirectionType.desc}`,
        });
}

/** The `orderBy` value a list DTO built with `PaginationOrderBySchema` carries. */
export type PaginationOrderByQuery = z.infer<
    ReturnType<typeof PaginationOrderBySchema>
>;

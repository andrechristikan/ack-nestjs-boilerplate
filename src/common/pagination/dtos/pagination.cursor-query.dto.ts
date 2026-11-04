import { z } from 'zod';
import {
    PaginationDefaultMaxPerPage,
    PaginationDefaultMaxSearchLength,
    PaginationDefaultPerPage,
} from '@common/pagination/constants/pagination.constant';

/**
 * Cursor list query: cursor, perPage, and search; a module list schema extends it and declares its own `orderBy` inline over its allow-list.
 * @public
 */
export const PaginationCursorQuerySchema = z.strictObject({
    cursor: z.string().optional().meta({
        description: 'The pagination cursor returned from the previous request',
        example:
            'aW85bVlDVzI3dUVKNzFkeEU0cmVnUS5iQnhZOVZvSklEbGo5MTIyLnlxUG1YYlVJd056OF9mUm5sNlRrNkgzYVRUWWtXdlJ1dk02ejhVT244dUFpMEFETTA5UjNEcHNfU0tjaXVmOWZtZko2V1l2WkswZnVuVDBvbXBtZzFqV21NWDg0a0NSY1pVbm00Y0ZxMUxDZkRiVmh5eXhkM19vNndXUXUzVnhYZjAyNjc1ekZ6UThjV2hyUUdWb1prTnNHZlNmQzgyelpQZ2NMTzJ0XzZmXzNycU0tQXFMcHVrRUdJUGtrUHNYRWFCUUIzb2VOb2Z1T1FpdEtVM2plaTNaZnh2WG9OZkJUVWlkTXBzYklidDA2LmxwNzFpNE5aWnNubjVBSVN2THp5QXc',
    }),
    perPage: z.coerce
        .number()
        .int()
        .optional()
        .meta({
            description: `Data per page, max ${PaginationDefaultMaxPerPage}`,
            example: PaginationDefaultPerPage,
        }),
    search: z
        .string()
        .trim()
        .max(PaginationDefaultMaxSearchLength)
        .optional()
        .meta({
            description: `Search query, case-insensitive, partial match, max ${PaginationDefaultMaxSearchLength} characters`,
            example: '',
        }),
});

/**
 * Inferred DTO for PaginationCursorQuerySchema.
 * @public
 */
export type PaginationCursorQueryDto = z.infer<
    typeof PaginationCursorQuerySchema
>;

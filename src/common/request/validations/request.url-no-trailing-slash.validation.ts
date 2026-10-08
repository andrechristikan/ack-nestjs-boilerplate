import { z } from 'zod';

/**
 * Absolute URL that does not end with a slash.
 * @public
 */
export const RequestUrlNoTrailingSlashSchema = z
    .url()
    .refine(url => !url.endsWith('/'))
    .meta({
        description: 'Absolute URL without a trailing slash',
        example: 'http://localhost:4566',
    });

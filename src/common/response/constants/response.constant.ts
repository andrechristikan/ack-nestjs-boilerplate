import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';

/**
 * Metadata key carrying the i18n message path from the `@Response`/`@ResponsePagination`
 * decorators to their interceptors.
 * @public
 */
export const ResponseMessagePathMetaKey = 'ResponseMessagePathMetaKey';

/**
 * Metadata key carrying the response payload schema from the `@Response`/`@ResponsePagination`
 * decorators to their interceptors.
 * @public
 */
export const ResponseSchemaMetaKey = 'ResponseSchemaMetaKey';

/**
 * Media type a `@ResponseFile` download publishes for each document extension.
 * @public
 */
export const ResponseFileMediaTypes: Record<EnumFileExtensionDocument, string> =
    {
        [EnumFileExtensionDocument.csv]: 'text/csv',
        [EnumFileExtensionDocument.pdf]: 'application/pdf',
    };

/**
 * Response header carrying the response timestamp.
 * @public
 */
export const ResponseTimestampHeaderName = 'x-timestamp';

/**
 * Response header carrying the response timezone.
 * @public
 */
export const ResponseTimezoneHeaderName = 'x-timezone';

/**
 * Response header carrying the API version.
 * @public
 */
export const ResponseVersionHeaderName = 'x-version';

/**
 * Response header carrying the repository version.
 * @public
 */
export const ResponseRepoVersionHeaderName = 'x-repo-version';

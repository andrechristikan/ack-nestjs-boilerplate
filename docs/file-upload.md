# File Upload and Presign Documentation

File upload lives in `src/common/file`. S3 lives in `src/common/aws`.

## Overview

Two upload transports:

- Multipart through the API: decorators, pipes, and services for single and multiple uploads, file validation, and CSV processing. Bytes travel as `multipart/form-data` to the Nest controller, then the domain writes to S3 with `AwsS3Service.putItem`.
- Presign: the client uploads or downloads with a time-limited S3 URL. The API issues the URL and, for uploads, later records the object key. Bytes never pass through the Nest process on the PUT/GET to S3.

## Related Documents

- [Request Validation Documentation][ref-doc-request-validation] - Request schemas and pipes
- [Handling Error Documentation][ref-doc-handling-error] - Upload exceptions
- [Language Message Documentation][ref-doc-message] - i18n for upload errors
- [Doc Documentation][ref-doc-doc] - OpenAPI for multipart and presign routes
- [Third Party Integration][ref-doc-third-party] - S3 credentials, no-op mode, bucket setup
- [Environment Documentation][ref-doc-environment] - `AWS_S3_*` variables
- [Term Policy Documentation][ref-doc-term-policy] - Admin content GET and content upload that use presign

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Decorators](#decorators)
  - [FileUploadSingle](#fileuploadsingle)
  - [FileUploadMultiple](#fileuploadmultiple)
  - [FileUploadMultipleFields](#fileuploadmultiplefields)
  - [Upload Transport Errors](#upload-transport-errors)
- [Enums](#enums)
- [Pipes](#pipes)
  - [FileExtensionPipe](#fileextensionpipe)
  - [FileCsvParsePipe](#filecsvparsepipe)
  - [FileCsvValidationPipe](#filecsvvalidationpipe)
- [CSV Import Flow](#csv-import-flow)
- [Usage](#usage)
  - [Basic File Upload](#basic-file-upload)
  - [CSV Import](#csv-import)
  - [Multiple Field Upload](#multiple-field-upload)
- [Error Handling](#error-handling)
- [Message Translation](#message-translation)
- [Presign GET](#presign-get)
- [Presign upload](#presign-upload)
  - [How It Works](#how-it-works)
  - [Implementation](#implementation)
  - [Configuration Options](#configuration-options)
  - [Response Structure](#response-structure)
  - [Flow Diagram](#flow-diagram)
  - [Term Policy Content Presign](#term-policy-content-presign)
  - [Multipart Part Presign](#multipart-part-presign)

## Decorators

The defaults come from `src/common/file/constants/file.constant.ts`:

- `FileSizeInBytes` is `bytes('10mb')`
- `FileMaxMultiple` is `3`

The `options` argument on every decorator is itself optional, but `IFileUploadSingle` and `IFileUploadMultiple` declare their fields as required. Pass the whole object or none of it.

Each decorator also emits multipart OpenAPI (`ApiConsumes('multipart/form-data')` plus a binary `ApiBody` from the field name(s)) and the upload error kit from `DocFileErrorResponses` in `src/common/doc/constants/doc.constant.ts`. Flow: [Doc Documentation][ref-doc-doc].

### FileUploadSingle

Handles single file upload with configurable field name and size limits. It also caps the request at one file.

**Parameters:**
- `options.field`: Field name in form-data (default when `options` is omitted: `'file'`)
- `options.fileSize`: Maximum file size in bytes (default when `options` is omitted: `FileSizeInBytes`)

**Example:**
```typescript
@FileUploadSingle({ field: 'photo', fileSize: bytes('5mb') })
```

### FileUploadMultiple

Handles multiple files upload with the same field name.

**Parameters:**
- `options.field`: Field name in form-data (default when `options` is omitted: `'files'`)
- `options.maxFiles`: Maximum number of files (default when `options` is omitted: `FileMaxMultiple`)
- `options.fileSize`: Maximum file size per file in bytes (default when `options` is omitted: `FileSizeInBytes`)

**Example:**
```typescript
@FileUploadMultiple({ field: 'documents', maxFiles: 5, fileSize: bytes('5mb') })
```

### FileUploadMultipleFields

Handles multiple files from different form fields.

**Parameters:**
- `fields`: Array of field configurations
  - `field`: Field name
  - `maxFiles`: Maximum files for this field
- `options.fileSize` (optional): Maximum file size per file in bytes (default: `FileSizeInBytes`)

The global `limits.files` is the sum of the declared per-field `maxFiles`, so the request-wide cap admits exactly what the per-field caps allow.

**Example:**
```typescript
@FileUploadMultipleFields(
  [
    { field: 'avatar', maxFiles: 1 },
    { field: 'documents', maxFiles: 2 }
  ],
  { fileSize: bytes('15mb') }
)
```

### Upload Transport Errors

All three decorators compose `FileUploadErrorInterceptor` (`src/common/file/interceptors/file.upload-error.interceptor.ts`) outermost, ahead of the multer interceptor it wraps. Multer and busboy signal a limit failure as a framework `HttpException` carrying a fixed message; the interceptor matches that message against Nest's `multerExceptions` / `busboyExceptions` and rethrows a typed file exception. The client message comes from the exception's own path (`file.error.exceedMaxSizeUpload`, …), not from a second catalog.

| Condition | Framework message | Exception | statusCode | HTTP |
|---|---|---|---|---|
| A file exceeds `fileSize` | `File too large` | `FileExceedMaxSizeUploadException` | 50106 | 413 |
| The request carries more files than the global `limits.files` | `Too many files` | `FileExceedMaxFilesException` | 50107 | 422 |
| A file arrives on a field the route did not declare, or past that field's `maxFiles` | `Unexpected field` | `FileFieldUnexpectedException` | 50108 | 422 |
| A malformed multipart body, or a part / field / nesting limit | `Multipart: Boundary not found`, `Too many parts`, `Field name too long`, and the rest of Nest's multipart messages | `FileMultipartInvalidException` | 50109 | 422 |

The framework appends ` - <field>` to several of those messages, so the interceptor matches on the segment before the first ` - `. A message outside the table passes through untouched.

## Enums

File extension enums for validation. These enums are used with `FileExtensionPipe` to restrict allowed file types for uploads.

### Available Enums

- `EnumFileExtensionImage`: Image files
  - `jpg`, `jpeg`, `png`

- `EnumFileExtensionDocument`: Document files
  - `pdf`, `csv`

- `EnumFileExtensionAudio`: Audio files
  - `mpeg`, `m4a`, `mp3`

- `EnumFileExtensionVideo`: Video files
  - `mp4`

- `EnumFileExtensionTemplate`: Template files
  - `hbs`

- `EnumFileExtension`: both a const object merging every group above and a union type of the five enums

**When to Use:**
- Mix members of several enums to accept more than one kind: `[EnumFileExtensionImage.jpg, EnumFileExtensionDocument.pdf]`
- Use specific enum for strict type control: only `EnumFileExtensionImage` values
- CSV enum is typically used with `FileCsvParsePipe` for data import features

## Pipes

### FileExtensionPipe

A mixin pipe built by `FileExtensionPipe(allowedExtensions)`. The declared extension and the bytes both have to agree with the allow-list. The pipe returns the value untouched; it never rewrites it.

For each file:

1. The declared extension comes off `file.originalname` through `FileService.extractExtensionFromFilename`, and has to be a member of `allowedExtensions`.
2. The first bytes of `file.buffer` are sniffed through `FileService.sniffExtensionFromBuffer`, which wraps the `file-type` package. The sniffed type is accepted when `FileExtensionContract` (`src/common/file/contracts/file.extension.contract.ts`) maps some member of the allow-list onto it.

`csv` is the signature-less member of `FileExtensionContract`: its entry is an empty array. A sniff that returns nothing is accepted when the declared extension is `csv` and that member is in the allow-list, and rejected for every other member. `hbs` is not in the table; templates are not uploaded through this pipe. Adding an uploadable extension to a group enum means adding its row to that table.

**Usage:**
Pass an array of allowed file extensions from the enum constants. A single file and an array of files are both accepted, and every element of an array is validated: one rejected file rejects the request.

**Passes through without validating:**
- A falsy value
- An empty object or an empty array

**Throws:**
- `FileExtensionInvalidException`: `originalname` is missing, the declared extension is not in the allow-list, the sniffed type maps to no member of the allow-list, or nothing was sniffed for an extension that carries a signature

### FileCsvParsePipe

Parses CSV (.csv) files into structured data array with rows and columns. This pipe converts raw file buffer into usable JavaScript objects using semicolon (;) as delimiter.

**Returns:**
Array of parsed row objects `T[]`, or `undefined` when no file was uploaded

**Supports:**
- CSV files (.csv) with semicolon delimiter
- Headers in first row become object property names
- Empty lines are automatically skipped
- Empty cells are parsed as `null`

**Throws:**
- `FileRequiredException`: Buffer is missing or zero-length
- `FileExtensionInvalidException`: Missing `originalname`, or an extension other than `csv`

### FileCsvValidationPipe

Validates every parsed CSV row against a zod request schema and reports the failures row by row.

**How it Works:**
1. Receives parsed data from `FileCsvParsePipe`
2. Rejects an empty row set, and a row set larger than the configured row cap
3. Runs each row through the schema, keeping the parsed output
4. A request schema is `z.strictObject`, so an unknown column fails the row
5. Collects all validation issues with row context, never failing fast on the first bad row
6. Throws `FileImportException` if any row failed

**Parameters:**
- The zod schema each row is validated against
- `options.maxDataImportConfigKey` (optional): config key holding the row cap (default `'file.maxDataImport'`, which is `100`)

The pipe factory runs at decoration time, before config is resolved, so it takes the config KEY and reads the value in the constructor. The user import passes `'user.maxDataImport'`, which is `50`.

**Throws:**
- `FileRequiredExtractFirstException`: No rows were passed in
- `FileExceedMaxDataImportException`: Row count exceeds the row cap read from the configured key
- `FileImportException`: Contains detailed validation errors with row context

## CSV Import Flow

CSV upload processing:

```mermaid
flowchart TD
    A[Client Upload<br/>CSV File] --> B[ @UploadedFile Decorator]
    B --> B2{FileRequiredPipe()}
    
    B2 -->|Missing File| B3[Throw FileRequiredException]
    B2 -->|Present| C{FileExtensionPipe}
    
    C -->|Invalid Extension| D[Throw FileExtensionInvalidException]
    C -->|Valid Extension| E{FileCsvParsePipe}
    
    E -->|Empty Buffer| F[Throw FileRequiredException]
    E -->|Not a .csv| G[Throw FileExtensionInvalidException]
    E -->|Success| H[Parse CSV to Array]
    
    H --> I{FileCsvValidationPipe}
    
    I -->|No Rows| I2[Throw FileRequiredExtractFirstException]
    I -->|Rows > configured row cap| I3[Throw FileExceedMaxDataImportException]
    I -->|Within Cap| J[Run Each Row Through the Schema]
    J --> K[Collect the Standard Schema issues]
    
    K -->|Row Issues| L[Collect Issues with Row Context]
    L --> M[Throw FileImportException]
    
    K -->|All Valid| N[Return Validated Data Array]
    N --> O[Controller Receives Data Array]
    O --> P[Process Validated Data]
    
    P --> Q[Save to Database]
    Q --> R[Return Success Response]
    
    style A fill:#e1f5ff
    style B3 fill:#ffe1e1
    style D fill:#ffe1e1
    style F fill:#ffe1e1
    style G fill:#ffe1e1
    style I2 fill:#ffe1e1
    style I3 fill:#ffe1e1
    style M fill:#ffe1e1
    style N fill:#e1ffe1
    style R fill:#e1ffe1
```

## Usage

### Basic File Upload

Single and multiple file uploads with extension validation.

**Single File Upload:**

The live example is `POST /shared/user/profile/photo/upload` on `UserSharedController`. The controller only dispatches: it calls `UserProfileHttpService.uploadPhotoProfile`, which forwards to the domain `UserProfileDomain`, where the S3 write happens.

```typescript
@UserSharedUploadPhotoProfileDoc()
@Response('user.uploadPhotoProfile')
@TermPolicyAcceptanceProtected()
@UserProtected()
@AuthJwtAccessProtected()
@ApiKeyProtected()
@FileUploadSingle()
@RequestTimeout('1m')
@RequestThrottle({ user: true, route: EnumRequestThrottleRoute.moderate })
@HttpCode(HttpStatus.OK)
@Post('/profile/photo/upload')
async uploadPhotoProfile(
  @AuthJwtPayload('userId') userId: string,
  @UploadedFile(
    FileRequiredPipe(),
    FileExtensionPipe([
      EnumFileExtensionImage.jpeg,
      EnumFileExtensionImage.png,
      EnumFileExtensionImage.jpg
    ])
  )
  file: IFile
): Promise<void> {
  await this.userProfileHttpService.uploadPhotoProfile(userId, file);
}
```

`UserProfileDomain.uploadPhotoProfile` derives the extension, builds the key, and writes the object:

```typescript
const extension: EnumFileExtensionImage =
  this.fileService.extractExtensionFromFilename(
    file.originalname
  ) as EnumFileExtensionImage;

const key: string = this.createRandomFilenamePhotoProfileWithPath(
  userId,
  { extension }
);

const aws: IAwsS3 | null = await this.awsS3Service.putItem(
  {
    key,
    size: file.size,
    file: file.buffer,
  },
  { access: EnumAwsS3Accessibility.public }
);
```

`options.access` is a required argument on every `AwsS3Service` method that reaches a bucket, and a profile photo is served by URL, so this call names `public`.

`putItem` behaviour:

- returns `null` when S3 credentials are not configured, and the domain skips the database write in that case
- otherwise the domain prepares `userUpdatePhotoProfile`, stores the S3 reference with one `UserRepository.updatePhotoProfile` update (no transaction), and then stages the event

**Multiple Files Upload:**

`@FileUploadMultiple` wires `FilesInterceptor` for an array of files under one field. Defaults:

- field: `files`
- max count: `FileMaxMultiple` (`3`)
- size: `FileSizeInBytes` (`10mb`)

`FileExtensionPipe` takes that array: it validates every element, and one rejected file rejects the request.

```typescript
@FileUploadMultiple({ field: 'files', maxFiles: 3, fileSize: bytes('5mb') })
```

Upload routes use `@FileUploadSingle`: `POST /shared/user/profile/photo/upload` and `POST /admin/user/import`.

### CSV Import

Import and validate data from CSV files. The live example is `POST /admin/user/import` on `UserAdminController`.

The pipe chain order is the contract: presence, then extension, then parse, then per-row validation.

The row shape is an ordinary request schema. `UserImportRequestSchema` picks `email`, `name` and `username` off `UserCreateRequestSchema`, so the import reuses the same field constraints as user creation:

```typescript
/**
 * Validates one row of a user import CSV.
 * @public
 */
export const UserImportRequestSchema = UserCreateRequestSchema.pick({
    email: true,
    name: true,
    username: true,
});

/**
 * One row of a user import CSV.
 * @public
 */
export type UserImportRequestDto = z.infer<typeof UserImportRequestSchema>;
```

```typescript
@UserAdminImportDoc()
@Response('user.import')
@TermPolicyAcceptanceProtected()
@PolicyProtected({
  subject: EnumPolicySubject.user,
  action: [EnumPolicyAction.read, EnumPolicyAction.create],
})
@RoleProtected(EnumRoleType.admin)
@UserProtected()
@AuthJwtAccessProtected()
@ApiKeyProtected()
@FileUploadSingle()
@RequestTimeout('1m')
@RequestThrottle({ user: true })
@HttpCode(HttpStatus.OK)
@Post('/import')
async import(
  @AuthJwtPayload('userId') createdBy: string,
  @UploadedFile(
    FileRequiredPipe(),
    FileExtensionPipe([EnumFileExtensionDocument.csv]),
    FileCsvParsePipe,
    FileCsvValidationPipe(UserImportRequestSchema, {
      maxDataImportConfigKey: 'user.maxDataImport',
    })
  )
  data: UserImportRequestDto[]
): Promise<void> {
  await this.userImportHttpService.importByAdmin(data, createdBy);
}
```

The row cap on this route is `user.maxDataImport`, which is `50`. The `adminUserImport` activity log is staged by the import flow, not declared on the route (see [Activity Log](activity-log.md)).

`FileCsvParsePipe` can also be used on its own when you only need the raw rows. It returns `T[]` of plain objects with no schema validation applied.

### Multiple Field Upload

`@FileUploadMultipleFields` wires `FileFieldsInterceptor` for named fields, each with its own `maxFiles`. Default size is `FileSizeInBytes`. No controller uses it.

```typescript
@FileUploadMultipleFields([
  { field: 'avatar', maxFiles: 1 },
  { field: 'documents', maxFiles: 1 },
  { field: 'certificates', maxFiles: 1 }
])
```

## Error Handling

### FileImportException

Thrown during CSV validation with detailed error context. The exception carries the exact row and its issues.

**Exception Structure:**

`FileImportException` extends `AppBaseException` and maps to HTTP 422. `AppValidationImportFilter` catches it and formats it into `ResponseErrorDto`:

```typescript
{
  statusCode: number;       // EnumRequestStatusCodeError.validation
  statusCodeKey: string;    // 'validation'
  module: string;           // 'file'
  message: string;
  metadata: object;         // standard response metadata
  errors: Array<{
    row: number;            // Row index (0-based)
    errors: Array<{
      key: string;          // camelCase zod issue code (e.g. 'invalidFormat', 'tooSmall')
      property: string;     // dotted property path
      message: string;      // Translated error message
    }>;
  }>;
}
```

### Common Errors

| Error Type | Status Code | HTTP | Message | Description |
|------------|-------------|------|---------|-------------|
| Invalid Extension | 50101 | 415 | `file.error.extensionInvalid` | The declared extension is not in the allow-list, or the sniffed bytes disagree with it |
| Empty File | 50100 | 422 | `file.error.required` | File buffer is empty or missing |
| Invalid Format | 50101 | 415 | `file.error.extensionInvalid` | File passed to CSV pipe is not a `.csv` file |
| Extract First | 50102 | 422 | `file.error.requiredExtractFirst` | Validation pipe received no rows |
| Exceed Max Import | 50103 | 422 | `file.error.exceedMaxDataImport` | Row count exceeds the configured row cap |
| Exceed Max Size Upload | 50106 | 413 | `file.error.exceedMaxSizeUpload` | A file exceeds the route's `fileSize` |
| Exceed Max Files | 50107 | 422 | `file.error.exceedMaxFiles` | The request carries more files than the route's global `limits.files` |
| Field Unexpected | 50108 | 422 | `file.error.fieldUnexpected` | A file arrived on a field the route does not accept |
| Multipart Invalid | 50109 | 422 | `file.error.multipartInvalid` | The multipart body is malformed, or a part / field limit was hit |
| Exceed Max Export | 50104 | 422 | `file.error.exceedMaxDataExport` | An export query returns more rows than its cap (`user.maxDataExport` for the user export) |
| Exceed Max Size Export | 50105 | 422 | `file.error.exceedMaxSizeExport` | The generated export file exceeds `file.maxSizeExportInBytes` (2 MB) |
| Validation Failed | 50300 | 422 | `file.error.validationDto` | Schema validation failed, with per-row details |

Every code except `50300` comes from `EnumFileStatusCodeError`. `Validation Failed` reuses `EnumRequestStatusCodeError.validation`, so its `statusCodeKey` is `validation` while its `module` is still `file`. The full catalog is [Status Codes](status-codes.md).

**Error Response Examples:**

```json
// Invalid Extension
{
  "statusCode": 50101,
  "statusCodeKey": "extensionInvalid",
  "module": "file",
  "message": "The file extension is invalid."
}

// Validation Errors
{
  "statusCode": 50300,
  "statusCodeKey": "validation",
  "module": "file",
  "message": "The imported data failed validation.",
  "errors": [
    {
      "row": 0,
      "errors": [
        {
          "key": "custom",
          "property": "email",
          "message": "email should be a valid email address."
        },
        {
          "key": "tooSmall",
          "property": "username",
          "message": "username is shorter than the minimum allowed."
        }
      ]
    }
  ]
}
```

## Message Translation

File validation errors are automatically translated using the i18n system. The `FileCsvValidationPipe` integrates with `MessageService` to provide localized error messages based on the user's language preference.

**How It Works:**

1. The schema's issues are collected per row
2. They are passed to `MessageService.setValidationImportMessage()`
3. The issue message is translated first, so a schema raising a message path speaks for itself; otherwise the camelCase issue code is looked up under `request.error.{key}`
4. `{property}` is interpolated with the last segment of the issue path
5. Localized messages are returned in the error response, each carrying `key`, `property`, and `message`

**Custom Error Messages:**

Add messages in `src/languages/<lang>/request.json`, one entry per zod issue code:

```json
{
  "error": {
    "tooSmall": "{property} is shorter than the minimum allowed.",
    "tooBig": "{property} is longer than the maximum allowed.",
    "invalidFormat": "{property} does not match the expected format."
  }
}
```

`{property}` is substituted with the last segment of the issue path.

See [Language Message Documentation][ref-doc-message] for i18n paths.

## Presign GET

S3 presigned URLs let a client upload or download an object for a limited time without AWS credentials.

`AwsS3Service.presignGetItem` produces a time-limited GET URL for an object that already exists in S3. Its only caller is `TermPolicyContentDomain.getContentByAdmin`, reached through `TermPolicyContentHttpService` and exposed as `GET /admin/term-policy/content/:termPolicyId/:language/get` on `TermPolicyAdminController` under the message key `termPolicy.getContent`. That call passes the `access` recorded on the stored content itself, so each content entry is signed against the bucket it lives in. There is no request DTO: `termPolicyId` and `language` are path params.

### Signature

```typescript
async presignGetItem(
  key: string,
  options: IAwsS3PresignGetItemOptions
): Promise<IAwsS3Presign | null>
```

### Parameters

- `key`: the S3 object key. A key that starts with `/` causes the method to throw.
- `options.access`: `EnumAwsS3Accessibility.public` or `EnumAwsS3Accessibility.private`, required. It selects which configured bucket is signed against, and the compiler refuses a call that leaves it out.
- `options.expiredInSeconds`: signature lifetime in seconds. When omitted it falls back to `aws.s3.presignExpiredInSeconds`, defined in `aws.config.ts` as `ms('30m') / 1000` and handed to the signer as it stands.

### Behaviour

- Returns `null` when S3 credentials are not configured, and logs a warning. A caller that needs a URL treats `null` as the S3 service being unavailable.
- Sends a `HeadObjectCommand` before signing. A `NotFound` is swallowed; any other S3 error propagates.
- Derives `extension` and `mime` from the key itself.
- The returned `IAwsS3Presign` carries `key`, `mime`, `extension`, `presignUrl`, and `expiredInSeconds`, where `expiredInSeconds` is the same lifetime that was used to sign.

---

## Presign upload

The client uploads directly to S3 with a time-limited PUT URL. The API never sees the file bytes.

### How It Works

1. Client requests a presigned URL from the backend with file metadata (extension, size)
2. Backend generates a unique S3 key and time-limited presigned URL
3. Client uploads the file **directly to S3** using the presigned URL via HTTP PUT
4. Client notifies the backend of successful upload with the S3 key
5. Backend saves file reference to database with audit trail

> [!NOTE]
> **Default expiration:** 30 minutes (`presignExpiredInSeconds: ms('30m') / 1000` in `aws.config.ts`, which is the unit the signer takes). Override per-call via the `expiredInSeconds` option.

### Implementation

**Step 1 - Request schemas:**

Both schemas pick `size` off `AwsS3PresignRequestSchema`, where it is `z.number().int()`. The update schema also reuses its `key` field (non-empty, matching `AwsS3ObjectKeyRegex`) with its own description.

```typescript
export const UserGeneratePhotoProfileRequestSchema =
    AwsS3PresignRequestSchema.pick({ size: true }).extend({
        extension: z.enum(EnumFileExtensionImage).meta({
            description: 'Image file extension of the profile photo',
            default: EnumFileExtensionImage.jpg,
            example: EnumFileExtensionImage.jpg,
        }),
    });

export const UserUpdateProfilePhotoRequestSchema =
    AwsS3PresignRequestSchema.pick({ size: true }).extend({
        key: AwsS3PresignRequestSchema.shape.key.meta({
            description:
                'Key of the uploaded profile photo, as returned by the presign step',
        }),
    });
```

**Step 2 - Controller Endpoints:**

`UserSharedController` is registered by `RouterHttpSharedModule`, which the router mounts under `/shared`. The endpoints below are therefore `POST /shared/user/profile/photo/presign/generate` and `PUT /shared/user/profile/photo/update`, under the configured global prefix and the `v1` version prefix.

```typescript
@ApiTags('modules.shared.user')
@Controller({
  version: '1',
  path: '/user',
})
export class UserSharedController {
  constructor(
    private readonly userProfileHttpService: UserProfileHttpService,
    // ... the other HTTP services this controller dispatches to
  ) {}

  @UserSharedGeneratePhotoProfilePresignDoc()
  @Response('user.generatePhotoProfilePresign', {
    schema: AwsS3PresignResponseSchema,
  })
  @TermPolicyAcceptanceProtected()
  @UserProtected()
  @AuthJwtAccessProtected()
  @ApiKeyProtected()
  @RequestThrottle({ user: true, route: EnumRequestThrottleRoute.moderate })
  @HttpCode(HttpStatus.OK)
  @Post('/profile/photo/presign/generate')
  async generatePhotoProfilePresign(
    @AuthJwtPayload('userId') userId: string,
    @Body({ schema: UserGeneratePhotoProfileRequestSchema })
    body: UserGeneratePhotoProfileRequestDto
  ): Promise<IResponseReturn<IAwsS3Presign>> {
    return this.userProfileHttpService.generatePhotoProfilePresign(
      userId,
      body
    );
  }

  @UserSharedUpdatePhotoProfileDoc()
  @Response('user.updatePhotoProfile')
  @TermPolicyAcceptanceProtected()
  @UserProtected()
  @AuthJwtAccessProtected()
  @ApiKeyProtected()
  @RequestThrottle({ user: true })
  @Put('/profile/photo/update')
  async updatePhotoProfile(
    @AuthJwtPayload('userId') userId: string,
    @Body({ schema: UserUpdateProfilePhotoRequestSchema })
    body: UserUpdateProfilePhotoRequestDto
  ): Promise<void> {
    await this.userProfileHttpService.updatePhotoProfile(userId, body);
  }
}
```

**Step 3 - Service Implementation:**

`UserProfileHttpService` is a thin hop: it awaits the domain and wraps the presign in `{ data: presign }` for the response interceptor. The S3 work lives in `UserProfileDomain`.

```typescript
@Injectable()
export class UserProfileDomain {
  async generatePhotoProfilePresign(
    userId: string,
    { extension, size }: IUserGeneratePhotoProfile
  ): Promise<IAwsS3Presign> {
    const key: string = this.createRandomFilenamePhotoProfileWithPath(userId, {
      extension,
    });

    const aws: IAwsS3Presign | null = await this.awsS3Service.presignPutItem(
      { key, size },
      { forceUpdate: true, access: EnumAwsS3Accessibility.public }
    );

    if (!aws) {
      throw new AwsServiceUnavailableException();
    }

    return aws;
  }

  async updatePhotoProfile(
    userId: string,
    { key, size }: IUserUpdatePhotoProfile
  ): Promise<void> {
    try {
      const aws: IAwsS3 = this.awsS3Service.mapPresign(
        { key, size },
        { access: EnumAwsS3Accessibility.public }
      );

      const events = [
        this.activityLogDomain.prepare({
          action: EnumActivityLogAction.userUpdatePhotoProfile,
        }),
      ];
      await this.userRepository.updatePhotoProfile(userId, aws);

      this.activityLogDomain.stagePrepared(events);

      return;
    } catch (err: unknown) {
      if (err instanceof AppBaseException) {
        throw err;
      }

      throw new AppUnknownException(err);
    }
  }
}
```

Two things follow from the options passed:

- `presignPutItem` and `mapPresign` both name `EnumAwsS3Accessibility.public`, so the photo is signed against, and stored in, the public bucket. `access` is a required option on both, so the value a call means is always written at the call site.
- No `expiredInSeconds` is passed, so the signature lives for `aws.s3.presignExpiredInSeconds`, which is 30 minutes.

`presignPutItem` returns `null` when S3 credentials are not configured, and the service converts that into `AwsServiceUnavailableException`.

`createRandomFilenamePhotoProfileWithPath` is a method on `UserProfileDomain`. It substitutes `{userId}` into `user.uploadPhotoProfilePath` and delegates to `FileService.createRandomFilename` with a 20-character random segment.

**Step 4 - Client-Side Upload:**
```typescript
async function uploadPhotoSimple(file: File) {
  try {
    // Step 1: Request presigned URL
    const response = await fetch('/api/v1/shared/user/profile/photo/presign/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        extension: file.name.split('.').pop(),
        size: file.size
      })
    });

    const { data: presignData } = await response.json();

    // Step 2: Upload to S3 (simple PUT request)
    const uploadResponse = await fetch(presignData.presignUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': presignData.mime,
      },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error('S3 upload failed');
    }

    // Step 3: Notify backend
    await fetch('/api/v1/shared/user/profile/photo/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        key: presignData.key,
        size: file.size
      })
    });

    console.log('Upload complete!');
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

### Configuration Options
```typescript
interface IAwsS3PresignPutItemOptions {
  access: EnumAwsS3Accessibility; // public or private, required
  expiredInSeconds?: number; // Expiration time in seconds (default from config)
  forceUpdate?: boolean; // Allow overwriting existing files
}
```

### Response Structure

`AwsS3PresignResponseSchema` declares exactly five fields, and the response interceptor strips anything else:

```typescript
export const AwsS3PresignResponseSchema = z.object({
  key: z.string(),          // S3 object key (save this for later reference)
  mime: z.string(),         // MIME type (use this as Content-Type header)
  extension: z.string(),    // File extension
  presignUrl: z.string(),   // The presigned URL for upload
  expiredInSeconds: z.number(), // URL lifetime in seconds
});
```

`AwsS3PresignPartResponseSchema` extends it with `partNumber` and `size`.

### Flow Diagram
```mermaid
sequenceDiagram
    participant Client
    participant Backend
    participant UserProfileDomain
    participant AwsS3Service
    participant S3 as AWS S3
    participant Repository as Database

    Client->>Backend: POST /profile/photo/presign/generate<br/>{extension, size}
    Backend->>UserProfileDomain: createRandomFilenamePhotoProfileWithPath()
    UserProfileDomain-->>Backend: unique S3 key
    
    Backend->>AwsS3Service: presignPutItem({key, size}, {forceUpdate: true, access: public})
    Note over AwsS3Service: ServerSideEncryption AES256,<br/>ChecksumAlgorithm SHA256,<br/>ContentDisposition inline
    AwsS3Service->>S3: Request presigned URL
    S3-->>AwsS3Service: Presigned URL (expires per config, default 30 min)
    AwsS3Service-->>Backend: IAwsS3Presign
    Backend-->>Client: {presignUrl, key, mime, expiredInSeconds}
    
    Note over Client,S3: Direct Upload (Bypass Backend)
    Client->>S3: PUT file to presignUrl<br/>Header: Content-Type only
    
    alt Upload success
        S3->>S3: Encrypt file with AES256
        S3-->>Client: 200 OK
        
        Client->>Backend: PUT /profile/photo/update<br/>{key, size}
        Backend->>AwsS3Service: mapPresign({ key, size }, { access: public })
        AwsS3Service-->>Backend: IAwsS3
        
        Backend->>Repository: updatePhotoProfile(userId, aws)
        Repository->>Repository: Save S3 reference + audit trail (request log read from store)
        Repository-->>Backend: Success
        Backend-->>Client: 200 OK
        
        Note over Client,Repository: Upload Complete
    else Upload failed
        S3-->>Client: Error (4xx/5xx)
        Note over Client: Retry or show error
    else URL expired
        S3-->>Client: 403 Forbidden
        Note over Client: Request new presign URL
    end
```

**Flow Explanation:**

1. **Generate Presigned URL Stage:**
   - Client requests presigned URL with file metadata (extension, size)
   - Backend generates a unique S3 key through `UserProfileDomain.createRandomFilenamePhotoProfileWithPath`, which delegates to `FileService.createRandomFilename`
   - `AwsS3Service` creates time-limited presigned URL with encryption enabled
   - Backend returns presigned URL data to client

2. **Direct Upload Stage:**
   - Client uploads file **directly to S3** using presigned URL
   - Only `Content-Type` header needed (encryption is automatic)
   - No backend involvement during actual file transfer
   - S3 encrypts file at rest with AES-256
   - Reduces server bandwidth and improves performance

3. **Database Update Stage:**
   - Client notifies backend with S3 key and file size
   - Backend maps presign data to `IAwsS3`
   - `UserProfileDomain` prepares `userUpdatePhotoProfile`, then `UserRepository.updatePhotoProfile` stores the S3 file reference in one update with no transaction
   - After the update the event is staged; `ActivityLogInterceptor` writes it with the IP address, user agent, and geolocation from the request store (`RequestLogStoreKey`)


### Term Policy Content Presign

The second presign endpoint signs a term policy content upload. `TermPolicyAdminController` is registered by `RouterHttpAdminModule`, so the route is `POST /admin/term-policy/content/presign/generate`.

```typescript
@TermPolicyAdminGenerateContentPresignDoc()
@Response('termPolicy.generateContentPresign', {
  schema: AwsS3PresignResponseSchema,
})
@TermPolicyAcceptanceProtected()
@PolicyProtected({
  subject: EnumPolicySubject.termPolicy,
  action: [
    EnumPolicyAction.read,
    EnumPolicyAction.create,
    EnumPolicyAction.update,
  ],
})
@RoleProtected(EnumRoleType.admin)
@UserProtected()
@AuthJwtAccessProtected()
@ApiKeyProtected()
@RequestThrottle({ user: true })
@HttpCode(HttpStatus.OK)
@Post('/content/presign/generate')
async generate(
  @Body({ schema: TermPolicyContentPresignRequestSchema })
  body: TermPolicyContentPresignRequestDto
): Promise<IResponseReturn<IAwsS3Presign>> {
  return this.termPolicyContentHttpService.generateContentPresignByAdmin(
    body
  );
}
```

- `TermPolicyContentPresignRequestSchema` carries `type` (from `TermPolicyAcceptRequestSchema`), `size` (picked from `AwsS3PresignRequestSchema`), `language` (`EnumMessageLanguage`), and `version` (integer).
- `TermPolicyContentDomain.generateContentPresignByAdmin` rejects the request with `TermPolicyStatusInvalidException` when a policy of that version and type is already `published`.
- The key is built by `TermPolicyUtil.createRandomFilenameContentWithPath` from `termPolicy.uploadContentPath` (`term-policies/{type}/v{version}`) plus `<language>.hbs`, so the same type, version and language always resolve to the same key.
- `presignPutItem` is called with `{ forceUpdate: true, access: EnumAwsS3Accessibility.private }`, so term policy content is signed against the private bucket. Expiry is the 30 minute config default.

### Multipart Part Presign

`AwsS3Service.presignPutItemPart({ key, size, uploadId, partNumber }, options)` signs a single `UploadPart` request for an existing multipart upload and returns `IAwsS3PresignPart` (`IAwsS3Presign` plus `partNumber` and `size`).

- Takes the same required `access` and optional `expiredInSeconds` as the other presign methods
- Returns `null` when S3 credentials are not configured
- No controller exposes it, so there is no multipart presign route


<!-- REFERENCES -->

[ref-doc-request-validation]: request-validation.md
[ref-doc-handling-error]: handling-error.md
[ref-doc-message]: language-message.md
[ref-doc-doc]: doc.md
[ref-doc-third-party]: third-party-integration.md
[ref-doc-environment]: environment.md
[ref-doc-term-policy]: term-policy.md

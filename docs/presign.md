# Presign Documentation

## Overview

AWS S3 presigned URLs provide secure, time-limited access to S3 objects without requiring AWS credentials. This feature enables controlled file sharing and temporary upload/download access with built-in encryption and security.

## Related Documents

- [Message Documentation][ref-doc-message] - For internationalization and error message translation
- [Handling Error Documentation][ref-doc-handling-error] - For exception handling and response formatting
- [Doc Documentation][ref-doc-doc] - For API documentation integration with DTOs
- [File Upload Documentation][ref-doc-file-upload] - For file validation pipes

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [AWS S3 Presigned URL Get Capability](#aws-s3-presigned-url-get-capability)
- [AWS S3 Presigned URL Upload](#aws-s3-presigned-url-upload)

## AWS S3 Presigned URL Get Capability

`AwsS3Service.presignGetItem` produces a time-limited GET URL for an object that already exists in S3. It is a service capability only. No controller calls it, so there is no route, no request DTO, and no message key for a download presign.

### Signature

```typescript
async presignGetItem(
  key: string,
  options?: IAwsS3PresignGetItemOptions
): Promise<IAwsS3Presign | null>
```

### Parameters

- `key`: the S3 object key. It must not start with `/`; the method throws when it does.
- `options.access`: `EnumAwsS3Accessibility.public` or `EnumAwsS3Accessibility.private`. It selects which configured bucket is signed against. When omitted the bucket resolves to `public`.
- `options.expiredInSeconds`: signature lifetime in seconds. When omitted it falls back to `aws.s3.presignExpiredInMs`, defined in `aws.config.ts` as `ms('30m')` and converted with `Math.floor(value / 1000)`.

### Behaviour

- Returns `null` when S3 credentials are not configured, and logs a warning. A caller that needs a URL treats `null` as the S3 service being unavailable.
- Sends a `HeadObjectCommand` before signing. A `NotFound` is swallowed; any other S3 error propagates.
- Derives `extension` and `mime` from the key itself.
- The returned `IAwsS3Presign` carries `key`, `mime`, `extension`, `presignUrl`, and `expiredIn`, where `expiredIn` is the same lifetime in seconds that was used to sign.

---

## AWS S3 Presigned URL Upload

AWS S3 presigned URLs enable secure client-side direct uploads to S3 without exposing AWS credentials. This approach is ideal for large files, reduces server bandwidth, and improves upload performance.

### How It Works

1. Client requests a presigned URL from the backend with file metadata (extension, size)
2. Backend generates a unique S3 key and time-limited presigned URL
3. Client uploads the file **directly to S3** using the presigned URL via HTTP PUT
4. Client notifies the backend of successful upload with the S3 key
5. Backend saves file reference to database with audit trail

> [!NOTE]
> **Default expiration:** 30 minutes (`presignExpiredInMs: ms('30m')` in `aws.config.ts`; the signer receives seconds via `Math.floor(value / 1000)`). Override per-call via the `expiredInSeconds` option.

### Implementation

**Step 1 - Request DTOs:**

Both DTOs take `size` from `AwsS3PresignRequestDto`, which validates it with `@IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 0 })`, `@IsInt()`, and `@IsNotEmpty()`.

```typescript
export class UserGeneratePhotoProfileRequestDto extends PickType(
  AwsS3PresignRequestDto,
  ['size']
) {
  @ApiProperty({
    type: 'string',
    enum: EnumFileExtensionImage,
    default: EnumFileExtensionImage.jpg,
  })
  @IsString()
  @IsEnum(EnumFileExtensionImage)
  @IsNotEmpty()
  extension: EnumFileExtensionImage;
}

export class UserUpdateProfilePhotoRequestDto extends PickType(
  AwsS3PresignRequestDto,
  ['size']
) {
  @ApiProperty({
    required: true,
    description: 'photo path key',
    example: 'user/profile/unique-photo-key.jpg',
  })
  @IsString()
  @IsNotEmpty()
  photoKey: string;
}
```

**Step 2 - Controller Endpoints:**

`UserSharedController` is registered by `RoutesSharedModule`, which the router mounts under `/shared`. The endpoints below are therefore `POST /shared/user/profile/generate-presign/photo` and `PUT /shared/user/profile/update/photo`, under the configured global prefix and the `v1` version prefix.

```typescript
@ApiTags('modules.shared.user')
@Controller({
  version: '1',
  path: '/user',
})
export class UserSharedController {
  constructor(private readonly userService: UserService) {}

  @UserSharedGeneratePhotoProfilePresignDoc()
  @Response('user.generatePhotoProfilePresign')
  @TermPolicyAcceptanceProtected()
  @UserProtected()
  @AuthJwtAccessProtected()
  @ApiKeyProtected()
  @HttpCode(HttpStatus.OK)
  @Post('/profile/generate-presign/photo')
  async generatePhotoProfilePresign(
    @AuthJwtPayload('userId') userId: string,
    @Body() body: UserGeneratePhotoProfileRequestDto
  ): Promise<IResponseReturn<AwsS3PresignResponseDto>> {
    return this.userService.generatePhotoProfilePresign(userId, body);
  }

  @UserSharedUpdatePhotoProfileDoc()
  @Response('user.updatePhotoProfile')
  @TermPolicyAcceptanceProtected()
  @UserProtected()
  @AuthJwtAccessProtected()
  @ApiKeyProtected()
  @Put('/profile/update/photo')
  async updatePhotoProfile(
    @AuthJwtPayload('userId') userId: string,
    @Body() body: UserUpdateProfilePhotoRequestDto
  ): Promise<void> {
    return this.userService.updatePhotoProfile(userId, body);
  }
}
```

**Step 3 - Service Implementation:**
```typescript
@Injectable()
export class UserService {
  async generatePhotoProfilePresign(
    userId: string,
    { extension, size }: UserGeneratePhotoProfileRequestDto
  ): Promise<IResponseReturn<AwsS3PresignResponseDto>> {
    const key: string =
      this.userUtil.createRandomFilenamePhotoProfileWithPath(userId, {
        extension,
      });

    const aws: IAwsS3Presign | null = await this.awsS3Service.presignPutItem(
      { key, size },
      { forceUpdate: true }
    );

    if (!aws) {
      throw new AwsServiceUnavailableException();
    }

    return { data: aws };
  }

  async updatePhotoProfile(
    userId: string,
    { photoKey, size }: UserUpdateProfilePhotoRequestDto
  ): Promise<void> {
    const requestLog: IRequestLog =
      this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

    const aws: IAwsS3 = this.awsS3Service.mapPresign({ key: photoKey, size });
    await this.userRepository.updatePhotoProfile(userId, aws, requestLog);

    return;
  }
}
```

Two things follow from the options actually passed:

- No `access` is passed, so both `presignPutItem` and `mapPresign` fall back to `EnumAwsS3Accessibility.public`. The photo is signed against, and stored in, the public bucket.
- No `expiredInSeconds` is passed, so the signature lives for `aws.s3.presignExpiredInMs`, which is 30 minutes.

`presignPutItem` returns `null` when S3 credentials are not configured, and the service converts that into `AwsServiceUnavailableException`.

**Step 4 - Client-Side Upload:**
```typescript
async function uploadPhotoSimple(file: File) {
  try {
    // Step 1: Request presigned URL
    const response = await fetch('/api/v1/shared/user/profile/generate-presign/photo', {
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
    await fetch('/api/v1/shared/user/profile/update/photo', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        photoKey: presignData.key,
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
  access?: EnumAwsS3Accessibility; // public or private
  expiredInSeconds?: number; // Expiration time in seconds (default from config)
  forceUpdate?: boolean; // Allow overwriting existing files
}
```

### Response Structure

`AwsS3PresignResponseDto` exposes exactly five fields, each carrying `@Expose()`:

```typescript
class AwsS3PresignResponseDto {
  key: string;           // S3 object key (save this for later reference)
  mime: string;          // MIME type (use this as Content-Type header)
  extension: string;     // File extension
  presignUrl: string;    // The presigned URL for upload
  expiredIn: number;     // URL lifetime in seconds
}
```

`AwsS3PresignPartResponseDto` extends it with `partNumber` and `size`, both also `@Expose()`d.

### Flow Diagram
```mermaid
sequenceDiagram
    participant Client
    participant Backend
    participant UserUtil
    participant AwsS3Service
    participant S3 as AWS S3
    participant Repository as Database

    Client->>Backend: POST /generate-presign/photo<br/>{extension, size}
    Backend->>UserUtil: createRandomFilenamePhotoProfileWithPath()
    UserUtil-->>Backend: unique S3 key
    
    Backend->>AwsS3Service: presignPutItem({key, size}, {forceUpdate: true})
    Note over AwsS3Service: ServerSideEncryption AES256,<br/>ChecksumAlgorithm SHA256,<br/>ContentDisposition inline
    AwsS3Service->>S3: Request presigned URL
    S3-->>AwsS3Service: Presigned URL (expires per config, default 30 min)
    AwsS3Service-->>Backend: IAwsS3Presign
    Backend-->>Client: {presignUrl, key, mime, expiredIn}
    
    Note over Client,S3: Direct Upload (Bypass Backend)
    Client->>S3: PUT file to presignUrl<br/>Header: Content-Type only
    
    alt Upload success
        S3->>S3: Encrypt file with AES256
        S3-->>Client: 200 OK
        
        Client->>Backend: PUT /update/photo<br/>{photoKey: key, size}
        Backend->>AwsS3Service: mapPresign(key, size)
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
   - Backend generates a unique S3 key through `UserUtil`, which delegates to `FileService.createRandomFilename`
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
   - Repository updates user profile with S3 file reference
   - Transaction logged with IP address and user agent for audit trail; the service reads the request log from the request store (`RequestLogStoreKey`) and threads the `IRequestLog` to the repository as the last parameter


### Term Policy Content Presign

The second presign endpoint signs a term policy content upload. `TermPolicyAdminController` is registered by `RoutesAdminModule`, so the route is `POST /admin/term-policy/generate/content/presign`.

```typescript
@TermPolicyAdminGenerateContentPresignDoc()
@Response('termPolicy.generateContentPresign')
@TermPolicyAcceptanceProtected()
@PolicyAbilityProtected({
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
@HttpCode(HttpStatus.OK)
@Post('/generate/content/presign')
async generate(
  @Body() body: TermPolicyContentPresignRequestDto
): Promise<IResponseReturn<AwsS3PresignResponseDto>> {
  return this.termPolicyService.generateContentPresignByAdmin(body);
}
```

- `TermPolicyContentPresignRequestDto` carries `type` (from `TermPolicyAcceptRequestDto`), `size` (picked from `AwsS3PresignRequestDto`), `language` (`EnumMessageLanguage`), and `version` (integer).
- The service rejects the request with `TermPolicyStatusInvalidException` when a policy of that version and type is already `published`.
- The key is built by `TermPolicyUtil.createRandomFilenameContentWithPath` with the `hbs` extension.
- `presignPutItem` is called with `{ forceUpdate: true, access: EnumAwsS3Accessibility.private }`, so term policy content is signed against the private bucket. Expiry is the 30 minute config default.

### Multipart Part Presign

`AwsS3Service.presignPutItemPart({ key, size, uploadId, partNumber }, options?)` signs a single `UploadPart` request for an existing multipart upload and returns `IAwsS3PresignPart` (`IAwsS3Presign` plus `partNumber` and `size`). It shares the same `access` and `expiredInSeconds` option handling, and returns `null` when S3 credentials are not configured. No controller exposes it, so there is no multipart presign route.


<!-- REFERENCES -->

[ref-doc-message]: message.md
[ref-doc-handling-error]: handling-error.md
[ref-doc-doc]: doc.md
[ref-doc-file-upload]: file-upload.md


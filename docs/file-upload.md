# File Upload Documentation

This documentation explains the features and usage of **File Module**: Located at `src/common/file`

## Overview

The file upload module provides a comprehensive solution for handling file uploads in NestJS applications. It includes decorators, pipes, services, and utilities for single/multiple file uploads, file validation, and Excel/CSV processing.

## Related Documentation

- [Request Validation Documentation][ref-doc-request-validation]
- [Handling Error Documentation][ref-doc-handling-error]
- [Message Documentation][ref-doc-message]

## Table of Contents

- [Overview](#overview)
- [Related Documentation](#related-documentation)
- [Constants](#constants)
- [Decorators](#decorators)
  - [FileUploadSingle](#fileuploadsingle)
  - [FileUploadMultiple](#fileuploadmultiple)
  - [FileUploadMultipleFields](#fileuploadmultiplefields)
- [Enums](#enums)
- [Pipes](#pipes)
  - [FileExtensionPipe](#fileextensionpipe)
  - [FileExcelParsePipe](#fileexcelparsepipe)
  - [FileExcelValidationPipe](#fileexcelvalidationpipe)
- [Usage Examples](#usage-examples)
  - [Basic Single File Upload](#basic-single-file-upload)
  - [Multiple Files Upload](#multiple-files-upload)
  - [Excel Import with Validation](#excel-import-with-validation)
  - [Multiple Field Upload](#multiple-field-upload)
- [AWS S3 Presigned URL Upload](#aws-s3-presigned-url-upload)
  - [How It Works](#how-it-works)
  - [Example](#example)
    - [Step 1: Request DTO](#step-1-request-dto)
    - [Step 2: Generate Presigned URL Endpoint](#step-2-generate-presigned-url-endpoint)
    - [Step 3: Service Implementation](#step-3-service-implementation)
    - [Step 4: Client-Side Upload](#step-4-client-side-upload)
  - [Configuration Options](#configuration-options)
  - [Response Structure](#response-structure)
- [Error Handling](#error-handling)
  - [FileImportException](#fileimportexception)
  - [Error Response Examples](#error-response-examples)
- [Message Translation](#message-translation)


## Constants

Default configuration values for file uploads:

```typescript
FILE_SIZE_IN_BYTES: 10MB (10485760 bytes)
FILE_MAX_MULTIPLE: 3 files
```

## Decorators

### FileUploadSingle

Handles single file upload with configurable field name and size limits.

**Parameters:**
- `options.field` (optional): Field name in form-data (default: `'file'`)
- `options.fileSize` (optional): Maximum file size in bytes (default: `FILE_SIZE_IN_BYTES`)

**Usage:**
```typescript
@FileUploadSingle({ field: 'photo', fileSize: bytes('5mb') })
@Post('/upload')
async uploadFile(@UploadedFile() file: IFile) {
  // Handle file
}
```

### FileUploadMultiple

Handles multiple files upload with the same field name.

**Parameters:**
- `options.field` (optional): Field name in form-data (default: `'files'`)
- `options.maxFiles` (optional): Maximum number of files (default: `2`)
- `options.fileSize` (optional): Maximum file size per file in bytes (default: `FILE_SIZE_IN_BYTES`)

**Usage:**
```typescript
@FileUploadMultiple({ field: 'documents', maxFiles: 5 })
@Post('/upload-multiple')
async uploadFiles(@UploadedFiles() files: IFile[]) {
  // Handle files
}
```

### FileUploadMultipleFields

Handles multiple files from different form fields.

**Parameters:**
- `fields`: Array of field configurations
  - `field`: Field name
  - `maxFiles`: Maximum files for this field
- `options.fileSize` (optional): Maximum file size per file in bytes (default: `FILE_SIZE_IN_BYTES`)

**Usage:**
```typescript
@FileUploadMultipleFields(
  [
    { field: 'avatar', maxFiles: 1 },
    { field: 'documents', maxFiles: 3 }
  ],
  { fileSize: bytes('15mb') }
)
@Post('/upload-fields')
async uploadMultipleFields(@UploadedFiles() files: { avatar?: IFile[], documents?: IFile[] }) {
  // Handle files from different fields
}
```

## Enums

File extension enums for validation:

- `ENUM_FILE_EXTENSION_IMAGE`: `JPG`, `JPEG`, `PNG`
- `ENUM_FILE_EXTENSION_DOCUMENT`: `PDF`
- `ENUM_FILE_EXTENSION_EXCEL`: `XLSX`, `CSV`
- `ENUM_FILE_EXTENSION_AUDIO`: `MPEG`, `M4A`, `MP3`
- `ENUM_FILE_EXTENSION_VIDEO`: `MP4`

## Pipes

### FileExtensionPipe

Validates uploaded file extensions against allowed types.

**Usage:**
```typescript
@Post('/upload')
async uploadImage(
  @UploadedFile(
    FileExtensionPipe([
      ENUM_FILE_EXTENSION_IMAGE.JPEG,
      ENUM_FILE_EXTENSION_IMAGE.PNG,
      ENUM_FILE_EXTENSION_IMAGE.JPG
    ])
  )
  file: IFile
) {
  // Only JPEG, PNG, JPG files allowed
}
```

**Multiple files:**
```typescript
@Post('/upload-multiple')
async uploadDocuments(
  @UploadedFiles(
    FileExtensionPipe([
      ENUM_FILE_EXTENSION_DOCUMENT.PDF,
      ENUM_FILE_EXTENSION_EXCEL.XLSX
    ])
  )
  files: IFile[]
) {
  // Only PDF and XLSX files allowed
}
```

### FileExcelParsePipe

Validates and parses Excel/CSV files into structured sheet data.

**Usage:**
```typescript
interface UserImportDto {
  name: string;
  email: string;
  age: number;
}

@Post('/import-users')
async importUsers(
  @UploadedFile(FileExcelParsePipe<UserImportDto>)
  sheets: IFileSheet<UserImportDto>[]
) {
  // sheets[0].data contains parsed rows
  // sheets[0].sheetName contains sheet name
}
```

**Supports:**
- Excel files (.xlsx)
- CSV files (.csv)

**Throws:**
- `UnprocessableEntityException`: Empty buffer or missing file
- `UnsupportedMediaTypeException`: Invalid extension

### FileExcelValidationPipe

Transforms and validates Excel data using DTO classes with class-validator decorators.

**Usage:**
```typescript
class UserImportDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsInt()
  @Min(18)
  age: number;
}

@Post('/import-users')
async importUsers(
  @UploadedFile(
    FileExcelParsePipe,
    new FileExcelValidationPipe([UserImportDto])
  )
  sheets: IFileSheet<UserImportDto>[]
) {
  // Data is parsed and validated against UserImportDto
}
```

**Multiple sheets with different DTOs:**
```typescript
@Post('/import-complex')
async importComplex(
  @UploadedFile(
    FileExcelParsePipe,
    new FileExcelValidationPipe([UserImportDto, ProductImportDto])
  )
  sheets: IFileSheet<UserImportDto | ProductImportDto>[]
) {
  // First sheet validated with UserImportDto
  // Second sheet validated with ProductImportDto
}
```

**Throws:**
- `FileImportException`: Contains detailed validation errors with sheet name and row context

## Usage Examples

### Basic Single File Upload

```typescript
@Controller('users')
export class UserController {
  @Post('/profile/upload/photo')
  @FileUploadSingle()
  @HttpCode(HttpStatus.OK)
  async uploadPhotoProfile(
    @UploadedFile(
      FileExtensionPipe([
        ENUM_FILE_EXTENSION_IMAGE.JPEG,
        ENUM_FILE_EXTENSION_IMAGE.PNG,
        ENUM_FILE_EXTENSION_IMAGE.JPG
      ])
    )
    file: IFile
  ) {
    // Process file
    const filename = this.fileService.createRandomFilename({
      path: 'profiles',
      prefix: 'photo',
      extension: this.fileService.extractExtensionFromFilename(file.originalname)
    });
    
    // Upload to storage service
    await this.storageService.upload(file.buffer, filename);
    
    return { filename };
  }
}
```

### Multiple Files Upload

```typescript
@Post('/documents/upload')
@FileUploadMultiple({ maxFiles: 5 })
async uploadDocuments(
  @UploadedFiles(
    FileExtensionPipe([
      ENUM_FILE_EXTENSION_DOCUMENT.PDF,
      ENUM_FILE_EXTENSION_EXCEL.XLSX
    ])
  )
  files: IFile[]
) {
  const uploadedFiles = [];
  
  for (const file of files) {
    const filename = this.fileService.createRandomFilename({
      path: 'documents',
      prefix: 'doc',
      extension: this.fileService.extractExtensionFromFilename(file.originalname)
    });
    
    await this.storageService.upload(file.buffer, filename);
    uploadedFiles.push(filename);
  }
  
  return { files: uploadedFiles };
}
```

### Excel Import with Validation

```typescript
class UserImportDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsInt()
  @Min(18)
  @Max(100)
  age: number;
}

@Post('/users/import')
@FileUploadSingle()
async importUsers(
  @UploadedFile(
    FileExtensionPipe([ENUM_FILE_EXTENSION_EXCEL.XLSX, ENUM_FILE_EXTENSION_EXCEL.CSV]),
    FileExcelParsePipe,
    new FileExcelValidationPipe([UserImportDto])
  )
  sheets: IFileSheet<UserImportDto>[]
) {
  const users = sheets[0].data;
  
  // Bulk create users
  await this.userRepository.createMany(users);
  
  return {
    imported: users.length,
    sheetName: sheets[0].sheetName
  };
}
```

### Multiple Field Upload

```typescript
@Post('/profile/complete')
@FileUploadMultipleFields([
  { field: 'avatar', maxFiles: 1 },
  { field: 'documents', maxFiles: 3 },
  { field: 'certificates', maxFiles: 2 }
])
async uploadCompleteProfile(
  @UploadedFiles() files: {
    avatar?: IFile[],
    documents?: IFile[],
    certificates?: IFile[]
  }
) {
  const result = {};
  
  if (files.avatar) {
    const avatar = files.avatar[0];
    const filename = this.fileService.createRandomFilename({
      path: 'avatars',
      prefix: 'avatar',
      extension: this.fileService.extractExtensionFromFilename(avatar.originalname)
    });
    await this.storageService.upload(avatar.buffer, filename);
    result.avatar = filename;
  }
  
  if (files.documents) {
    result.documents = [];
    for (const doc of files.documents) {
      const filename = this.fileService.createRandomFilename({
        path: 'documents',
        prefix: 'doc',
        extension: this.fileService.extractExtensionFromFilename(doc.originalname)
      });
      await this.storageService.upload(doc.buffer, filename);
      result.documents.push(filename);
    }
  }
  
  return result;
}
```

## AWS S3 Presigned URL Upload

AWS S3 presigned URLs provide a secure way to allow client-side direct uploads to S3 without exposing AWS credentials. This approach is ideal for large file uploads and reduces server load by bypassing the backend server.

### How It Works

1. **Generate Presigned URL**: Client requests a presigned URL from the backend
2. **Client Upload**: Client uploads the file directly to S3 using the presigned URL
3. **Update Reference**: Client notifies the backend of the successful upload

### Example

#### Step 1: Request DTO

```typescript
import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsInt, IsNumber } from 'class-validator';
import { ENUM_FILE_EXTENSION_IMAGE } from '@common/file/enums/file.enum';

export class UserGeneratePhotoProfileRequestDto {
  @ApiProperty({
    type: 'string',
    enum: ENUM_FILE_EXTENSION_IMAGE,
    default: ENUM_FILE_EXTENSION_IMAGE.JPG,
  })
  @IsString()
  @IsEnum(ENUM_FILE_EXTENSION_IMAGE)
  @IsNotEmpty()
  extension: ENUM_FILE_EXTENSION_IMAGE;

  @ApiProperty({
    required: true,
    description: 'File size in bytes',
  })
  @IsNumber({
    allowInfinity: false,
    allowNaN: false,
    maxDecimalPlaces: 0,
  })
  @IsInt()
  @IsNotEmpty()
  size: number;
}

export class UserUpdateProfilePhotoRequestDto {
  @ApiProperty({
    required: true,
    description: 'Photo path key from S3',
    example: 'user/profile/unique-photo-key.jpg',
  })
  @IsString()
  @IsNotEmpty()
  photo: string;

  @ApiProperty({
    required: true,
    description: 'File size in bytes',
  })
  @IsNumber({
    allowInfinity: false,
    allowNaN: false,
    maxDecimalPlaces: 0,
  })
  @IsInt()
  @IsNotEmpty()
  size: number;
}
```

#### Step 2: Generate Presigned URL Endpoint

```typescript
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @Response('user.generatePhotoProfilePresign')
  @UserProtected()
  @AuthJwtAccessProtected()
  @Post('/profile/generate-presign/photo')
  @HttpCode(HttpStatus.OK)
  async generatePhotoProfilePresign(
    @AuthJwtPayload('userId') userId: string,
    @Body() body: UserGeneratePhotoProfileRequestDto
  ): Promise<IResponseReturn<AwsS3PresignDto>> {
    return this.userService.generatePhotoProfilePresign(userId, body);
  }

  @Response('user.updatePhotoProfile')
  @UserProtected()
  @AuthJwtAccessProtected()
  @Put('/profile/update/photo')
  async updatePhotoProfile(
    @AuthJwtPayload('userId') userId: string,
    @Body() body: UserUpdateProfilePhotoRequestDto,
    @RequestIPAddress() ipAddress: string,
    @RequestUserAgent() userAgent: RequestUserAgentDto
  ): Promise<IResponseReturn<void>> {
    return this.userService.updatePhotoProfile(userId, body, {
      ipAddress,
      userAgent,
    });
  }
}
```

#### Step 3: Service Implementation

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly awsS3Service: AwsS3Service,
    private readonly userRepository: UserRepository,
    private readonly fileService: FileService
  ) {}

  async generatePhotoProfilePresign(
    userId: string,
    { extension, size }: UserGeneratePhotoProfileRequestDto
  ): Promise<IResponseReturn<AwsS3PresignDto>> {
    // Generate unique filename with path
    const key: string = this.fileService.createRandomFilename({
      path: `user/${userId}/profile`,
      prefix: 'photo',
      extension,
    });

    // Generate presigned URL
    const presign: AwsS3PresignDto = await this.awsS3Service.presignPutItem(
      { key, size },
      { 
        forceUpdate: true,
        access: ENUM_AWS_S3_ACCESSIBILITY.PUBLIC,
        expired: 3600 // 1 hour
      }
    );

    return { data: presign };
  }

  async updatePhotoProfile(
    userId: string,
    { photo, size }: UserUpdateProfilePhotoRequestDto,
    requestLog: IRequestLog
  ): Promise<IResponseReturn<void>> {
    try {
      // Map presigned data to AwsS3Dto
      const aws: AwsS3Dto = this.awsS3Service.mapPresign({
        key: photo,
        size,
      });

      // Update user profile with photo reference
      await this.userRepository.updatePhotoProfile(userId, aws, requestLog);

      return;
    } catch (err: unknown) {
      throw new InternalServerErrorException({
        statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
        message: 'http.serverError.internalServerError',
        _error: err,
      });
    }
  }
}
```

#### Step 4: Client-Side Upload

```typescript
// Frontend example (React/Angular/Vue)
async function uploadPhotoWithPresign(file: File) {
  try {
    // Step 1: Request presigned URL
    const response = await fetch('/api/users/profile/generate-presign/photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        extension: file.name.split('.').pop(),
        size: file.size
      })
    });

    const { data: presignData } = await response.json();
    // presignData contains: { presignUrl, key, extension, mime, expiredIn }

    // Step 2: Upload directly to S3
    await fetch(presignData.presignUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': presignData.mime,
        'Content-Length': file.size.toString(),
        'x-amz-checksum-algorithm': 'SHA256'
      },
      body: file
    });

    // Step 3: Notify backend of successful upload
    await fetch('/api/users/profile/update/photo', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        photo: presignData.key,
        size: file.size
      })
    });

    console.log('Photo uploaded successfully!');
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
```

### Configuration Options

```typescript
interface IAwsS3PresignOptions {
  access?: ENUM_AWS_S3_ACCESSIBILITY; // PUBLIC or PRIVATE
  expired?: number; // Expiration time in seconds (default from config)
  forceUpdate?: boolean; // Allow overwriting existing files
}
```

### Response Structure

```typescript
interface AwsS3PresignDto {
  presignUrl: string;    // The presigned URL for upload
  key: string;           // S3 object key
  extension: string;     // File extension
  mime: string;          // MIME type
  expiredIn: number;     // URL expiration time in seconds
}
```

## Error Handling

### FileImportException

Thrown during Excel validation with detailed error context.

```typescript
try {
  await this.importUsers(file);
} catch (error) {
  if (error instanceof FileImportException) {
    // error.errors contains:
    // - row: sheet index
    // - sheetName: name of the sheet
    // - errors: ValidationError[] from class-validator
    
    return {
      statusCode: error.statusCode,
      message: error.message,
      errors: error.errors.map(e => ({
        sheet: e.sheetName,
        row: e.row,
        validationErrors: e.errors
      }))
    };
  }
}
```

### Error Response Examples

**Invalid Extension:**
```json
{
  "statusCode": 5011,
  "message": "file.error.extensionInvalid"
}
```

**Validation Errors:**
```json
{
  "statusCode": 5030,
  "message": "file.error.validationDto",
  "errors": [
    {
      "row": 0,
      "sheetName": "Users",
      "errors": [
        {
          "property": "email",
          "constraints": {
            "isEmail": "email must be an email"
          }
        }
      ]
    }
  ]
}
```

## Message Translation

File validation errors are automatically translated using the i18n system. The `FileExcelValidationPipe` integrates with `MessageService` to provide localized error messages.

### How It Works

When validation fails during file import, the pipe:

1. Captures `ValidationError[]` from class-validator
2. Passes errors to `MessageService.setValidationImportMessage()`
3. Translates each constraint using i18n keys: `request.error.{constraint}`
4. Returns localized error messages based on user's language preference

See [Message Documentation][ref-doc-message] for language configuration details.

### Custom Error Messages

Add custom validation messages in i18n files for any class-validator constraint:

```json
{
  "error": {
    "min": "{property} must not be less than {value}",
    "max": "{property} must not be greater than {value}",
    "minLength": "{property} must be longer than or equal to {value} characters",
    "maxLength": "{property} must be shorter than or equal to {value} characters",
    "matches": "{property} must match {value} format"
  }
}
```

<!-- REFERENCES -->

<!-- BADGE LINKS -->

[ack-contributors-shield]: https://img.shields.io/github/contributors/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-forks-shield]: https://img.shields.io/github/forks/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-stars-shield]: https://img.shields.io/github/stars/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-issues-shield]: https://img.shields.io/github/issues/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-license-shield]: https://img.shields.io/github/license/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[nestjs-shield]: https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white
[nodejs-shield]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[typescript-shield]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[mongodb-shield]: https://img.shields.io/badge/MongoDB-white?style=for-the-badge&logo=mongodb&logoColor=4EA94B
[jwt-shield]: https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white
[jest-shield]: https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white
[yarn-shield]: https://img.shields.io/badge/yarn-%232C8EBB.svg?style=for-the-badge&logo=yarn&logoColor=white
[docker-shield]: https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white
[github-shield]: https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white
[linkedin-shield]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white

<!-- CONTACTS -->

[ref-author-linkedin]: https://linkedin.com/in/andrechristikan
[ref-author-email]: mailto:andrechristikan@gmail.com
[ref-author-github]: https://github.com/andrechristikan
[ref-author-paypal]: https://www.paypal.me/andrechristikan
[ref-author-kofi]: https://ko-fi.com/andrechristikan

<!-- Repo LINKS -->

[ref-ack]: https://github.com/andrechristikan/ack-nestjs-boilerplate
[ref-ack-issues]: https://github.com/andrechristikan/ack-nestjs-boilerplate/issues
[ref-ack-stars]: https://github.com/andrechristikan/ack-nestjs-boilerplate/stargazers
[ref-ack-forks]: https://github.com/andrechristikan/ack-nestjs-boilerplate/network/members
[ref-ack-contributors]: https://github.com/andrechristikan/ack-nestjs-boilerplate/graphs/contributors
[ref-ack-license]: LICENSE.md

<!-- THIRD PARTY -->

[ref-nestjs]: http://nestjs.com
[ref-prisma]: https://www.prisma.io
[ref-mongodb]: https://docs.mongodb.com/
[ref-redis]: https://redis.io
[ref-bullmq]: https://bullmq.io
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-yarn]: https://yarnpkg.com
[ref-12factor]: https://12factor.net
[ref-commander]: https://nest-commander.jaymcdoniel.dev
[ref-package-json]: package.json
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
[ref-google-console]: https://console.cloud.google.com/
[ref-google-client-secret]: https://developers.google.com/identity/protocols/oauth2

<!-- DOCUMENTS -->

[ref-doc-root]: readme.md
[ref-doc-activity-log]: docs/activity-log.md
[ref-doc-authentication]: docs/authentication.md
[ref-doc-authorization]: docs/authorization.md
[ref-doc-cache]: docs/cache.md
[ref-doc-configuration]: docs/configuration.md
[ref-doc-database]: docs/database.md
[ref-doc-environment]: docs/environment.md
[ref-doc-feature-flag]: docs/feature-flag.md
[ref-doc-file-upload]: docs/file-upload.md
[ref-doc-handling-error]: docs/handling-error.md
[ref-doc-installation]: docs/installation.md
[ref-doc-logger]: docs/logger.md
[ref-doc-message]: docs/message.md
[ref-doc-pagination]: docs/pagination.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response]: docs/response.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-doc]: docs/doc.md
[ref-doc-third-party-integration]: docs/third-party-integration.md
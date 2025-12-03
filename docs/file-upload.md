# File Upload

## Overview

The file upload module provides a comprehensive solution for handling file uploads in NestJS applications. It includes decorators, pipes, services, and utilities for single/multiple file uploads, file validation, and Excel/CSV processing.

## Related Documentation

- [Request Validation][ref-doc-request-validation]
- [Handling Error][ref-doc-handling-error]
- [Message][ref-doc-message]

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
  - [FileExcelParsePipe](#fileexcelparseipe)
  - [FileExcelValidationPipe](#fileexcelvalidationpipe)
- [Usage Examples](#usage-examples)
  - [Basic Single File Upload](#basic-single-file-upload)
  - [Multiple Files Upload](#multiple-files-upload)
  - [Excel Import with Validation](#excel-import-with-validation)
  - [Multiple Field Upload](#multiple-field-upload)
- [Error Handling](#error-handling)
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

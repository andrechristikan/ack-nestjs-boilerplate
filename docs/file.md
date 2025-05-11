# Overview

The File Module provides comprehensive file handling capabilities across the application. It's designed to handle various file operations, including uploading, validating, parsing, and processing different file types such as Excel, CSV, images, and other media formats.

## Table of Contents
- [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Service](#service)
  - [Enums](#enums)
  - [Constants](#constants)
  - [Error Handling](#error-handling)
  - [Decorators](#decorators)
    - [Single File Upload](#single-file-upload)
    - [Multiple Files Upload](#multiple-files-upload)
    - [Multiple Fields Upload](#multiple-fields-upload)
    - [File Part Number](#file-part-number)
  - [Pipes](#pipes)
    - [Required Validation](#required-validation)
    - [Type Validation](#type-validation)
    - [Excel](#excel)
      - [Parsing Excel/CSV Files](#parsing-excelcsv-files)
      - [Validating Excel/CSV Data](#validating-excelcsv-data)
  - [Response Handling for Excel/CSV Files](#response-handling-for-excelcsv-files)
  - [DTOs for File Operations](#dtos-for-file-operations)
  - [Examples](#examples)
    - [Basic File Upload](#basic-file-upload)
    - [Excel Import](#excel-import)
    - [Excel Export](#excel-export)

## Service

The `FileService` implements `IFileService` and provides methods for reading and writing Excel and CSV files:

```typescript
@Injectable()
export class FileService implements IFileService {
    // CSV operations
    writeCsv<T>(rows: IFileRows<T>): Buffer;
    readCsv<T>(file: Buffer): IFileRows<T>;
    
    // Excel operations
    writeExcel<T>(rows: IFileRows<T>[]): Buffer;
    readExcel<T>(file: Buffer): IFileRows<T>[];
}
```

## Enums

The module supports various file types through enumerated MIME types:

```typescript
export enum ENUM_FILE_TYPE {
    AUDIO = 'audio',
    IMAGE = 'image',
    EXCEL = 'excel',
    VIDEO = 'video',
}

export enum ENUM_FILE_MIME_IMAGE {
    JPG = 'image/jpg',
    JPEG = 'image/jpeg',
    PNG = 'image/png',
}

export enum ENUM_FILE_MIME_EXCEL {
    XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    CSV = 'text/csv',
}
```

## Constants

The file module has predefined constants:

```typescript
// Default maximum file size (5MB)
export const FILE_SIZE_IN_BYTES: number = bytes('5mb');
```

## Error Handling

The module provides consistent error handling through status codes:

```typescript
export enum ENUM_FILE_STATUS_CODE_ERROR {
    REQUIRED = 5020,
    MAX_SIZE = 5021,
    MIME_INVALID = 5022,
    MAX_FILES = 5023,
}
```

## Decorators

### Single File Upload

```typescript
@FileUploadSingle({
    field: 'file',
    fileSize: FILE_SIZE_IN_BYTES
})
```

### Multiple Files Upload

```typescript
@FileUploadMultiple({
    field: 'files',
    maxFiles: 5,
    fileSize: FILE_SIZE_IN_BYTES
})
```

### Multiple Fields Upload

```typescript
@FileUploadMultipleFields(
    [
        { field: 'avatar', maxFiles: 1 },
        { field: 'documents', maxFiles: 5 }
    ],
    { fileSize: FILE_SIZE_IN_BYTES }
)
```

### File Part Number

```typescript
@Get('upload')
async getPartNumber(
    @FilePartNumber() partNumber: number
) {
    // Handle the part number
    // Used for supporting multipart uploads with resumability
}
```

## Pipes

### Required Validation

The `FileRequiredPipe` ensures that required files are present in the request:

```typescript
@Post('upload')
async upload(
    @UploadedFile(new FileRequiredPipe()) file: IFile
) {
    // Process file
}
```

### Type Validation

The `FileTypePipe` validates that uploaded files match the expected MIME types:

```typescript
@Post('upload-image')
async uploadImage(
    @UploadedFile(
        new FileRequiredPipe(),
        new FileTypePipe([ENUM_FILE_MIME_IMAGE.JPG, ENUM_FILE_MIME_IMAGE.PNG])
    ) file: IFile
) {
    // Process image file
}
```

### Excel

For Excel/CSV files, the module provides specialized pipes:

#### Parsing Excel/CSV Files

The `FileExcelParsePipe` extracts data from Excel or CSV files:

```typescript
@Post('import')
async import(
    @UploadedFile(
        new FileRequiredPipe(),
        new FileTypePipe([ENUM_FILE_MIME_EXCEL.XLSX, ENUM_FILE_MIME_EXCEL.CSV]),
        new FileExcelParsePipe<RecordType>()
    ) file: IFileRows<RecordType>[]
) {
    // Implementation
    const rows = file[0].data;
    // Process rows
}
```

#### Validating Excel/CSV Data

The `FileExcelValidationPipe` validates the extracted data against a DTO:

```typescript
@Post('import')
async import(
    @UploadedFile(
        new FileRequiredPipe(),
        new FileTypePipe([ENUM_FILE_MIME_EXCEL.XLSX]),
        new FileExcelParsePipe<RecordType>(),
        new FileExcelValidationPipe<ValidatedRecordType>(RecordDto)
    ) file: IFileRows<ValidatedRecordType>[]
) {
    // Implementation with validated data
}
```

Note: The `FileExcelValidationPipe` should only be used after `FileExcelParsePipe`.

## Response Handling for Excel/CSV Files

The module integrates with the Response module to handle Excel/CSV file responses:

```typescript
@ResponseFileExcel({
    type: ENUM_HELPER_FILE_EXCEL_TYPE.XLSX
})
@Get('export')
async export(): Promise<IResponseFileExcel> {
    const data = await this.service.getData();
    
    return {
        data: [{ data, sheetName: 'Sheet1' }]
    };
}
```

For CSV files, only the first sheet in the returned data array will be used, as CSV files don't support multiple sheets.

## DTOs for File Operations

The module provides DTOs for API documentation:

```typescript
// For single file uploads
export class FileSingleDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
    })
    file: IFile;
}


// For multiple file uploads
export class FileMultipleDto {
    @ApiProperty({
        type: 'array',
        items: { type: 'string', format: 'binary', description: 'Multi file' },
    })
    files: IFile[];
}
```

## Examples

### Basic File Upload

```typescript
@Post('upload')
@FileUploadSingle()
async uploadFile(
    @UploadedFile(
        new FileRequiredPipe(),
        new FileTypePipe([ENUM_FILE_MIME_IMAGE.JPG, ENUM_FILE_MIME_IMAGE.PNG])
    ) file: IFile
) {
    return { filename: file.originalname, size: file.size };
}
```

### Excel Import

```typescript
@Post('import')
@FileUploadSingle()
async importData(
    @UploadedFile(
        new FileRequiredPipe(),
        new FileTypePipe([ENUM_FILE_MIME_EXCEL.XLSX, ENUM_FILE_MIME_EXCEL.CSV]),
        new FileExcelParsePipe<RecordDto>(),
        new FileExcelValidationPipe<RecordDto>(RecordDto)
    ) file: IFileRows<RecordDto>[]
) {
    return await this.service.importData(file);
}
```

### Excel Export

```typescript
@ResponseFileExcel({ type: ENUM_HELPER_FILE_EXCEL_TYPE.XLSX })
@Get('export')
async exportData(): Promise<IResponseFileExcel> {
    const data = await this.service.getData();
    return {
        data: [{ data, sheetName: 'Data Export' }]
    };
}
```

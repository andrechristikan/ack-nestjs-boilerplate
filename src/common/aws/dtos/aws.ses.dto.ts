import { IsCustomEmail } from '@common/request/validations/request.custom-email.validation';
import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsNotEmpty,
    IsNotEmptyObject,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';

/**
 * DTO for AWS SES email template configuration.
 * Contains template name, subject, and body content for email templates.
 */
export class AwsSESTemplateDto {
    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({
        required: false,
    })
    @IsOptional()
    @IsString()
    htmlBody?: string;

    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    subject: string;

    @ApiProperty({
        required: false,
    })
    @IsOptional()
    @IsString()
    plainTextBody?: string;
}

/**
 * DTO for retrieving AWS SES email template by name.
 */
export class AwsSESGetTemplateDto extends PickType(AwsSESTemplateDto, [
    'name',
] as const) {}

/**
 * DTO for sending emails through AWS SES using templates.
 * Supports single email sending with recipients, CC, BCC, and template data.
 * @template T - Type of template data object
 */
export class AwsSESSendDto<T> {
    @ApiProperty({
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    templateName: string;

    @ApiProperty({
        required: false,
    })
    @IsOptional()
    @IsObject()
    @IsNotEmptyObject()
    templateData?: T;

    @ApiProperty({
        required: true,
    })
    @IsCustomEmail()
    @IsString()
    @IsNotEmpty()
    sender: string;

    @ApiProperty({
        required: false,
    })
    @IsCustomEmail()
    @IsString()
    @IsOptional()
    replyTo?: string;

    @ApiProperty({
        required: true,
        isArray: true,
    })
    @IsNotEmpty()
    @IsCustomEmail({ each: true })
    @IsArray()
    @ArrayNotEmpty()
    recipients: string[];

    @ApiProperty({
        required: true,
        isArray: true,
    })
    @IsOptional()
    @IsCustomEmail({ each: true })
    @IsArray()
    cc?: string[];

    @ApiProperty({
        required: true,
        isArray: true,
    })
    @IsOptional()
    @IsCustomEmail({ each: true })
    @IsArray()
    bcc?: string[];
}

/**
 * DTO representing individual recipient data for bulk email sending.
 * Contains recipient email and optional template data specific to that recipient.
 */
export class AwsSESSendBulkRecipientsDto extends PickType(AwsSESSendDto, [
    'templateData',
] as const) {
    @ApiProperty({
        required: true,
    })
    @IsCustomEmail()
    @IsString()
    @IsNotEmpty()
    recipient: string;
}

/**
 * DTO for sending bulk emails through AWS SES.
 * Allows sending to multiple recipients with individual template data for each recipient.
 */
export class AwsSESSendBulkDto extends OmitType(AwsSESSendDto, [
    'recipients',
    'templateData',
]) {
    @ApiProperty({
        required: true,
        isArray: true,
        type: [AwsSESSendBulkRecipientsDto],
    })
    @IsNotEmpty()
    @IsArray()
    @ArrayNotEmpty()
    @Type(() => AwsSESSendBulkRecipientsDto)
    recipients: AwsSESSendBulkRecipientsDto[];
}

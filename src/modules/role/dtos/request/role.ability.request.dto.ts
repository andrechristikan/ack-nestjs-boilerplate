import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayNotEmpty,
    IsArray,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import {
    EnumPolicyAction,
    EnumPolicyEffect,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { Transform } from 'class-transformer';

export class RoleAbilityRequestDto {
    @ApiProperty({
        required: true,
        description: 'Ability subject',
        enum: EnumPolicySubject,
    })
    @IsNotEmpty()
    @IsString()
    @IsEnum(EnumPolicySubject)
    subject: EnumPolicySubject;

    @ApiProperty({
        required: true,
        description: 'Ability action base on subject',
        isArray: true,
        default: [EnumPolicyAction.manage],
        enum: EnumPolicyAction,
    })
    @IsString({ each: true })
    @IsEnum(EnumPolicyAction, { each: true })
    @IsArray()
    @IsNotEmpty()
    @ArrayNotEmpty()
    action: EnumPolicyAction[];

    @ApiProperty({
        required: false,
        description: 'Ability effect (allow or deny)',
        enum: EnumPolicyEffect,
        default: EnumPolicyEffect.can,
    })
    @Transform(({ value }) => value ?? EnumPolicyEffect.can)
    @IsEnum(EnumPolicyEffect)
    @IsOptional()
    effect?: EnumPolicyEffect = EnumPolicyEffect.can;

    @ApiProperty({
        required: false,
        description: 'Optional field-level authorization list',
        isArray: true,
        type: String,
    })
    @IsString({ each: true })
    @IsArray()
    @IsOptional()
    fields?: string[];

    @ApiProperty({
        required: false,
        description: 'Optional CASL conditions object (Mongo-like query syntax)',
        type: Object,
        additionalProperties: true,
    })
    @IsObject()
    @IsOptional()
    conditions?: Record<string, unknown>;

    @ApiProperty({
        required: false,
        description: 'Optional human-readable reason for rule',
        maxLength: 255,
    })
    @IsString()
    @MaxLength(255)
    @IsOptional()
    reason?: string;

    @ApiProperty({
        required: false,
        description: 'Optional priority, lower values are applied first',
        default: 0,
    })
    @Transform(({ value }) =>
        value === undefined || value === null ? 0 : Number(value)
    )
    @IsInt()
    @Min(0)
    @IsOptional()
    priority?: number;
}

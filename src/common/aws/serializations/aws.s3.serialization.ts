import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {GraphqlSchema} from "../../graphql/decorators/graphql.decorator";
import {Field} from "@nestjs/graphql";

@GraphqlSchema('AwsS3Serialization')
export class AwsS3Serialization {
    @Field()
    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.system.directoryPath(),
    })
    @Type(() => String)
    path: string;

    @Field()
    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.system.filePath(),
    })
    @Type(() => String)
    pathWithFilename: string;


    @Field()
    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.system.fileName(),
    })
    @Type(() => String)
    filename: string;

    @Field()
    @ApiProperty({
        required: true,
        nullable: false,
        example: `${faker.internet.url()}/${faker.system.filePath()}`,
    })
    @Type(() => String)
    completedUrl: string;

    @Field()
    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.internet.url(),
    })
    @Type(() => String)
    baseUrl: string;

    @Field()
    @ApiProperty({
        required: true,
        nullable: false,
        example: faker.system.mimeType(),
    })
    @Type(() => String)
    mime: string;
}

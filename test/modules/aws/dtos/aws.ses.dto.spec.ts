import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import {
    AwsSESCreateTemplateDto,
    AwsSESGetTemplateDto,
    AwsSESSendBulkDto,
    AwsSESSendBulkRecipientsDto,
    AwsSESSendDto,
    AwsSESUpdateTemplateDto,
} from 'src/modules/aws/dtos/aws.ses.dto';

describe('aws.ses.dto.ts', () => {
    it('should create a valid AwsSESCreateTemplateDto object', () => {
        const mockAwsSESCreateTemplateDto: AwsSESCreateTemplateDto = {
            name: faker.string.alpha(10),
            htmlBody: faker.string.alpha(15),
            subject: faker.string.alpha(20),
            plainTextBody: faker.string.alpha(10),
        };

        const dto = plainToInstance(
            AwsSESCreateTemplateDto,
            mockAwsSESCreateTemplateDto
        );

        expect(dto).toBeInstanceOf(AwsSESCreateTemplateDto);
    });

    it('should create a valid AwsSESUpdateTemplateDto object', () => {
        const mockAwsSESUpdateTemplateDto: AwsSESCreateTemplateDto = {
            name: faker.string.alpha(10),
            htmlBody: faker.string.alpha(15),
            subject: faker.string.alpha(20),
            plainTextBody: faker.string.alpha(10),
        };

        const dto = plainToInstance(
            AwsSESUpdateTemplateDto,
            mockAwsSESUpdateTemplateDto
        );

        expect(dto).toBeInstanceOf(AwsSESCreateTemplateDto);
    });

    it('should create a valid AwsSESGetTemplateDto object', () => {
        const mockAwsSESGetTemplateDto: AwsSESGetTemplateDto = {
            name: faker.string.alpha(10),
        };

        const dto = plainToInstance(
            AwsSESGetTemplateDto,
            mockAwsSESGetTemplateDto
        );

        expect(dto).toBeInstanceOf(AwsSESGetTemplateDto);
    });

    it('should create a valid AwsSESSendDto object', () => {
        const mockAwsSESSendDto = {
            templateName: faker.string.alpha(10),
            templateData: {},
            sender: faker.string.alpha(10),
            replyTo: faker.string.alpha(10),
            recipients: [faker.string.alpha(10)],
            cc: [faker.string.alpha(10)],
            bcc: [faker.string.alpha(10)],
        };

        const dto = plainToInstance(AwsSESSendDto, mockAwsSESSendDto);

        expect(dto).toBeInstanceOf(AwsSESSendDto);
    });

    it('should create a valid AwsSESSendBulkRecipientsDto object', () => {
        const mockAwsSESSendBulkRecipientsDto = {
            templateData: {},
            recipient: faker.string.alpha(10),
        };

        const dto = plainToInstance(
            AwsSESSendBulkRecipientsDto,
            mockAwsSESSendBulkRecipientsDto
        );

        expect(dto).toBeInstanceOf(AwsSESSendBulkRecipientsDto);
    });

    it('should create a valid AwsSESSendBulkDto object', () => {
        const mockAwsSESSendBulkDto = {
            templateName: faker.string.alpha(10),
            sender: faker.string.alpha(10),
            replyTo: faker.string.alpha(10),
            cc: [faker.string.alpha(10)],
            bcc: [faker.string.alpha(10)],
            recipients: { recipient: faker.string.alpha(10) },
        };

        const dto = plainToInstance(AwsSESSendBulkDto, mockAwsSESSendBulkDto);

        expect(dto).toBeInstanceOf(AwsSESSendBulkDto);
    });
});

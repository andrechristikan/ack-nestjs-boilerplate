import { readFileSync } from 'fs';
import { join } from 'path';
import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TemplateDoesNotExistException } from '@aws-sdk/client-ses';
import type { GetTemplateCommandOutput } from '@aws-sdk/client-ses';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type { INotificationTemplateAccountProcess } from '@modules/notification/interfaces/notification.interface';
import { NotificationTemplateAccountService } from '@modules/notification/services/notification.template.account.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';

describe('NotificationTemplateAccountService', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const templateDir = join(
        import.meta.dirname,
        '../../../../../src/modules/notification/templates'
    );
    const templates: {
        process: INotificationTemplateAccountProcess;
        file: string;
        subject: string;
        label: string;
    }[] = [
        {
            process: EnumNotificationProcess.welcome,
            file: 'notification.welcome.template.hbs',
            subject: 'Welcome',
            label: 'welcome',
        },
        {
            process: EnumNotificationProcess.welcomeSocial,
            file: 'notification.welcome-social.template.hbs',
            subject: 'Welcome Social',
            label: 'welcome social',
        },
        {
            process: EnumNotificationProcess.welcomeByAdmin,
            file: 'notification.welcome-by-admin.template.hbs',
            subject: 'Welcome By Admin',
            label: 'welcome by admin',
        },
        {
            process: EnumNotificationProcess.verificationEmail,
            file: 'notification.verification-email.template.hbs',
            subject: 'Email Verification',
            label: 'verification email',
        },
        {
            process: EnumNotificationProcess.verifiedEmail,
            file: 'notification.verified-email.template.hbs',
            subject: 'Email Verified',
            label: 'verified email',
        },
        {
            process: EnumNotificationProcess.verifiedMobileNumber,
            file: 'notification.verified-mobile-number.template.hbs',
            subject: 'MobileNumber Verified',
            label: 'verified mobile number',
        },
    ];
    let service: NotificationTemplateAccountService;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationTemplateAccountService,
                { provide: AwsSESService, useValue: awsSESService },
                { provide: NotificationUtil, useValue: notificationUtil },
            ],
        }).compile();
        service = module.get(NotificationTemplateAccountService);
    });

    describe('emailImport', () => {
        it.each(templates)(
            'creates the $process template from $file',
            async ({ process, file, subject }) => {
                awsSESService.createTemplate.mockResolvedValue({
                    $metadata: {},
                });

                await expect(
                    service.emailImport(process)
                ).resolves.toBeUndefined();
                expect(awsSESService.createTemplate).toHaveBeenCalledWith({
                    name: process,
                    subject,
                    htmlBody: readFileSync(join(templateDir, file), 'utf8'),
                });
            }
        );

        it.each(templates)(
            'throws an AppUnknownException naming the $process import when the create call rejects',
            async ({ process, label }) => {
                const error = new Error('ses down');
                awsSESService.createTemplate.mockRejectedValue(error);
                notificationUtil.toTemplateLabel.mockReturnValue(label);

                await expect(
                    service.emailImport(process)
                ).rejects.toMatchObject({
                    constructor: AppUnknownException,
                    rawError: error,
                    description: `Failed to import ${label} template`,
                });
                expect(notificationUtil.toTemplateLabel).toHaveBeenCalledWith(
                    process
                );
            }
        );
    });

    describe('emailGet', () => {
        it.each(templates)(
            'returns the $process template from SES',
            async ({ process }) => {
                const template: GetTemplateCommandOutput = {
                    $metadata: {},
                    Template: { TemplateName: process },
                };
                awsSESService.getTemplate.mockResolvedValue(template);

                const result = await service.emailGet(process);

                expect(result).toBe(template);
                expect(awsSESService.getTemplate).toHaveBeenCalledWith({
                    name: process,
                });
            }
        );

        it.each(templates)(
            'returns null for the $process template-not-found answer',
            async ({ process }) => {
                awsSESService.getTemplate.mockRejectedValue(
                    new TemplateDoesNotExistException({
                        message: 'missing',
                        $metadata: {},
                    })
                );

                await expect(service.emailGet(process)).resolves.toBeNull();
            }
        );

        it.each(templates)(
            'throws an AppUnknownException naming the $process get for any other error',
            async ({ process, label }) => {
                const error = new Error('ses down');
                awsSESService.getTemplate.mockRejectedValue(error);
                notificationUtil.toTemplateLabel.mockReturnValue(label);

                await expect(service.emailGet(process)).rejects.toMatchObject({
                    constructor: AppUnknownException,
                    rawError: error,
                    description: `Failed to get ${label} template`,
                });
                expect(notificationUtil.toTemplateLabel).toHaveBeenCalledWith(
                    process
                );
            }
        );
    });

    describe('emailDelete', () => {
        it.each(templates)(
            'deletes the $process template',
            async ({ process }) => {
                awsSESService.deleteTemplate.mockResolvedValue({
                    $metadata: {},
                });

                await expect(
                    service.emailDelete(process)
                ).resolves.toBeUndefined();
                expect(awsSESService.deleteTemplate).toHaveBeenCalledWith({
                    name: process,
                });
            }
        );

        it.each(templates)(
            'throws an AppUnknownException naming the $process delete when the delete call rejects',
            async ({ process, label }) => {
                const error = new Error('ses down');
                awsSESService.deleteTemplate.mockRejectedValue(error);
                notificationUtil.toTemplateLabel.mockReturnValue(label);

                await expect(
                    service.emailDelete(process)
                ).rejects.toMatchObject({
                    constructor: AppUnknownException,
                    rawError: error,
                    description: `Failed to delete ${label} template`,
                });
                expect(notificationUtil.toTemplateLabel).toHaveBeenCalledWith(
                    process
                );
            }
        );
    });
});

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
import type { INotificationTemplateSecurityProcess } from '@modules/notification/interfaces/notification.interface';
import { NotificationTemplateSecurityDomain } from '@modules/notification/domains/notification.template.security.domain';
import { NotificationUtil } from '@modules/notification/utils/notification.util';

describe('NotificationTemplateSecurityDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const templateDir = join(
        import.meta.dirname,
        '../../../../../src/modules/notification/templates'
    );
    const templates: {
        process: INotificationTemplateSecurityProcess;
        file: string;
        subject: string;
        label: string;
    }[] = [
        {
            process: EnumNotificationProcess.changePassword,
            file: 'notification.change-password.template.hbs',
            subject: 'Change Password',
            label: 'change password',
        },
        {
            process: EnumNotificationProcess.temporaryPasswordByAdmin,
            file: 'notification.temporary-password-by-admin.template.hbs',
            subject: 'Temporary Password By Admin',
            label: 'temporary password by admin',
        },
        {
            process: EnumNotificationProcess.resetPassword,
            file: 'notification.reset-password.template.hbs',
            subject: 'Reset Password',
            label: 'reset password',
        },
        {
            process: EnumNotificationProcess.forgotPassword,
            file: 'notification.forgot-password.template.hbs',
            subject: 'Forgot Password',
            label: 'forgot password',
        },
        {
            process: EnumNotificationProcess.resetTwoFactorByAdmin,
            file: 'notification.reset-two-factor-by-admin.template.hbs',
            subject: 'Reset Two Factor By Admin',
            label: 'reset two factor by admin',
        },
        {
            process: EnumNotificationProcess.newDeviceLogin,
            file: 'notification.new-device-login.template.hbs',
            subject: 'Device Login',
            label: 'new device login',
        },
    ];
    let domain: NotificationTemplateSecurityDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                NotificationTemplateSecurityDomain,
                { provide: AwsSESService, useValue: awsSESService },
                { provide: NotificationUtil, useValue: notificationUtil },
            ],
        }).compile();
        domain = module.get(NotificationTemplateSecurityDomain);
    });

    describe('emailImport', () => {
        it.each(templates)(
            'creates the $process template from $file',
            async ({ process, file, subject }) => {
                awsSESService.createTemplate.mockResolvedValue({
                    $metadata: {},
                });

                await expect(
                    domain.emailImport(process)
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

                await expect(domain.emailImport(process)).rejects.toMatchObject(
                    {
                        constructor: AppUnknownException,
                        rawError: error,
                        description: `Failed to import ${label} template`,
                    }
                );
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

                const result = await domain.emailGet(process);

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

                await expect(domain.emailGet(process)).resolves.toBeNull();
            }
        );

        it.each(templates)(
            'throws an AppUnknownException naming the $process get for any other error',
            async ({ process, label }) => {
                const error = new Error('ses down');
                awsSESService.getTemplate.mockRejectedValue(error);
                notificationUtil.toTemplateLabel.mockReturnValue(label);

                await expect(domain.emailGet(process)).rejects.toMatchObject({
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
                    domain.emailDelete(process)
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

                await expect(domain.emailDelete(process)).rejects.toMatchObject(
                    {
                        constructor: AppUnknownException,
                        rawError: error,
                        description: `Failed to delete ${label} template`,
                    }
                );
                expect(notificationUtil.toTemplateLabel).toHaveBeenCalledWith(
                    process
                );
            }
        );
    });
});

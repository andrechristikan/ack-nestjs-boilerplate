import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import type { IUserContact } from '@modules/user/interfaces/user.interface';
import { NotificationEmailTermPolicyDomain } from '@modules/notification/domains/notification.email.term-policy.domain';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('NotificationEmailTermPolicyDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    let domain: NotificationEmailTermPolicyDomain;

    const users: IUserContact[] = [
        { id: 'user-1', email: 'nadia@example.com', username: 'nadia' },
        { id: 'user-2', email: 'omar@example.com', username: 'omar' },
    ];
    const data = { type: EnumTermPolicyType.privacy, version: 3 };

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(configService.get).mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'email.noreply': 'noreply@example.com',
                'email.support': 'support@example.com',
                'home.name': 'Home',
                'home.url': 'https://home.example.com',
                'email.batchSize': 1,
            };

            return values[key];
        });
        const module = await Test.createTestingModule({
            providers: [
                NotificationEmailTermPolicyDomain,
                { provide: AwsSESService, useValue: awsSESService },
                { provide: ConfigService, useValue: configService },
                { provide: UserDomain, useValue: userDomain },
                {
                    provide: HelperArrayService,
                    useValue: helperArrayService,
                },
            ],
        }).compile();
        domain = module.get(NotificationEmailTermPolicyDomain);
    });

    describe('processPublishTermPolicy', () => {
        it('sends one bulk email per chunk and waits between chunks', async () => {
            userDomain.getListActive.mockResolvedValue(users);
            helperArrayService.chunk.mockReturnValue([[users[0]], [users[1]]]);
            awsSESService.sendBulk.mockResolvedValue({
                $metadata: {},
                Status: [],
            });

            const run = domain.processPublishTermPolicy(data);

            await vi.advanceTimersByTimeAsync(999);
            expect(awsSESService.sendBulk).toHaveBeenCalledTimes(1);

            await vi.advanceTimersByTimeAsync(1);
            expect(awsSESService.sendBulk).toHaveBeenCalledTimes(2);

            await vi.advanceTimersByTimeAsync(1000);
            const result = await run;

            expect(helperArrayService.chunk).toHaveBeenCalledWith(users, 1);
            expect(awsSESService.sendBulk).toHaveBeenNthCalledWith(1, {
                templateName: EnumNotificationProcess.publishTermPolicy,
                recipients: [
                    {
                        recipient: users[0].email,
                        templateData: { username: users[0].username },
                    },
                ],
                sender: 'noreply@example.com',
                defaultTemplateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    type: data.type,
                    version: '3',
                },
            });
            expect(awsSESService.sendBulk).toHaveBeenNthCalledWith(2, {
                templateName: EnumNotificationProcess.publishTermPolicy,
                recipients: [
                    {
                        recipient: users[1].email,
                        templateData: { username: users[1].username },
                    },
                ],
                sender: 'noreply@example.com',
                defaultTemplateData: {
                    homeName: 'Home',
                    supportEmail: 'support@example.com',
                    homeUrl: 'https://home.example.com',
                    type: data.type,
                    version: '3',
                },
            });
            expect(result).toMatchObject({
                message: 'Publish term policy email processed',
            });
        });

        it('rethrows when SES rejects', async () => {
            userDomain.getListActive.mockResolvedValue(users);
            helperArrayService.chunk.mockReturnValue([users]);
            const error = new Error('ses down');
            awsSESService.sendBulk.mockRejectedValue(error);

            await expect(domain.processPublishTermPolicy(data)).rejects.toBe(
                error
            );
        });
    });
});

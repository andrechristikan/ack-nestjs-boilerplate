import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';

import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { NotificationEmailTermPolicyDomain } from '@modules/notification/domains/notification.email.term-policy.domain';
import type { IUserContact } from '@modules/user/interfaces/user.interface';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('NotificationEmailTermPolicyDomain', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    const user = mock<IUserContact>({
        id: 'user-id',
        email: 'user@example.com',
        username: 'user',
    });
    let service: NotificationEmailTermPolicyDomain;

    beforeEach(() => {
        vi.useFakeTimers();
        Reflect.set(
            configService,
            'get',
            vi.fn(
                (key: string | symbol) =>
                    ({
                        'email.noreply': 'no-reply@example.com',
                        'email.support': 'support@example.com',
                        'home.name': 'ACK',
                        'home.url': 'https://example.com',
                        'email.batchSize': 10,
                    })[String(key)]
            )
        );
        userDomain.getListActive.mockResolvedValue([user]);
        helperArrayService.chunk.mockReturnValue([[user]]);
        awsSESService.sendBulk.mockResolvedValue({ $metadata: {}, Status: [] });
        service = new NotificationEmailTermPolicyDomain(
            awsSESService,
            configService,
            userDomain,
            helperArrayService
        );
    });

    afterEach(() => vi.useRealTimers());

    it('sends each recipient batch with shared and per-user template data', async () => {
        const resultPromise = service.processPublishTermPolicy({
            type: 'privacy',
            version: 2,
        });
        await vi.runAllTimersAsync();
        await expect(resultPromise).resolves.toEqual({
            message: 'Publish term policy email processed',
            results: [{ $metadata: {}, Status: [] }],
        });
        expect(awsSESService.sendBulk).toHaveBeenCalledWith(
            expect.objectContaining({
                recipients: [
                    {
                        recipient: user.email,
                        templateData: { username: user.username },
                    },
                ],
                defaultTemplateData: expect.objectContaining({
                    type: 'privacy',
                    version: '2',
                }),
            })
        );
    });

    it('returns no provider results for an empty user list', async () => {
        userDomain.getListActive.mockResolvedValue([]);
        helperArrayService.chunk.mockReturnValue([]);
        await expect(
            service.processPublishTermPolicy({ type: 'privacy', version: 2 })
        ).resolves.toEqual({
            message: 'Publish term policy email processed',
            results: [],
        });
    });

    it('rethrows provider failures', async () => {
        const error = new Error('SES down');
        awsSESService.sendBulk.mockRejectedValue(error);
        await expect(
            service.processPublishTermPolicy({ type: 'privacy', version: 2 })
        ).rejects.toBe(error);
    });
});

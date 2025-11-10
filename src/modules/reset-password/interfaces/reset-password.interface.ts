export interface IResetPasswordCreate {
    expiredAt: Date;
    expiredInMinutes: number;
    resendInMinutes: number;
    reference: string;
    token: string;
    link: string;
}

export interface IUserVerificationService {
    verifyEmail(token: string): Promise<void>;
    sendVerificationEmail(email: string): Promise<void>;
}

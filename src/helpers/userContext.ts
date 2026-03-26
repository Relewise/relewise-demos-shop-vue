import type { Company, User } from '@relewise/client';

export function sanitizeUser(user: User) {
    const normalizedUser: User = {
        ...user,
        classifications: user.classifications ? { ...user.classifications } : undefined,
        identifiers: user.identifiers ? { ...user.identifiers } : undefined,
        data: user.data ? { ...user.data } : undefined,
    };

    delete normalizedUser.company;

    return normalizedUser;
}

export function sanitizeUsers(users?: User[]) {
    return (users ?? []).map(sanitizeUser);
}

export function buildContextUser(user: User | undefined, company: Company | undefined) {
    const baseUser = user ? sanitizeUser(user) : {};

    return {
        ...baseUser,
        company,
    } as User;
}

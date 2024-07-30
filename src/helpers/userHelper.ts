import type { User } from '@relewise/client';

export const displayUser = (user: User | null | undefined) => {
    if (!user) return '';

    if (user.email)
        return user.email;

    if (user.authenticatedId)
        return user.authenticatedId;

    if (user.temporaryId)
        return user.temporaryId;

    return 'Unknown';
};
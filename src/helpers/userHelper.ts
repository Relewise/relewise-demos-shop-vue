import type { User } from '@relewise/client';

export const displayUser = (user: User | null | undefined) => {
    if (!user) return '';

    if (user.email)
        return user.authenticatedId
            ? `${user.email} (${user.authenticatedId})`
            : user.email;

    if (user.authenticatedId)
        return user.authenticatedId;

    if (user.temporaryId)
        return user.temporaryId;

    return 'Anonymous';
};

export const displayUserOption = (user: User | null | undefined, index: number) => {
    const label = displayUser(user);

    if (label !== 'Anonymous') {
        return label;
    }

    return `Anonymous user ${index + 1}`;
};

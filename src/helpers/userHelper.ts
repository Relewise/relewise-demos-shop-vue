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

function isAnonymousUser(user: User | null | undefined) {
    return displayUser(user) === 'Anonymous';
}

export const displayUserOption = (user: User | null | undefined, index: number, users: User[] = []) => {
    const label = displayUser(user);

    if (label !== 'Anonymous') {
        return label;
    }

    const anonymousUsers = users.filter((candidateUser) => isAnonymousUser(candidateUser));
    if (anonymousUsers.length <= 1) {
        return 'Anonymous user';
    }

    const anonymousUserIndex = users
        .slice(0, index + 1)
        .filter((candidateUser) => isAnonymousUser(candidateUser))
        .length;

    return anonymousUserIndex <= 1 ? 'Anonymous user' : `Anonymous user (${anonymousUserIndex})`;
};

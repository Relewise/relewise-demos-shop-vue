import { displayUser } from '@/helpers/userHelper';
import type { Company, User } from '@relewise/client';

export function getSelectedUser(users: User[] | undefined, selectedUserIndex: number | undefined) {
    if (selectedUserIndex === undefined || !users || selectedUserIndex < 0 || selectedUserIndex >= users.length) {
        return undefined;
    }

    return users[selectedUserIndex];
}

export function getSelectedUserLabel(users: User[] | undefined, selectedUserIndex: number | undefined) {
    const user = getSelectedUser(users, selectedUserIndex);
    return user ? displayUser(user) || '(None)' : '(None)';
}

export function formatUserDetails(user: User | undefined) {
    if (!user) {
        return 'No user selected.';
    }

    const details: string[] = [];

    if (user.authenticatedId) {
        details.push(`Authenticated ID: ${user.authenticatedId}`);
    }

    if (user.email) {
        details.push(`Email: ${user.email}`);
    }

    if (user.temporaryId) {
        details.push(`Temporary ID: ${user.temporaryId}`);
    }

    for (const [key, value] of Object.entries(user.identifiers ?? {})) {
        if (key && value) {
            details.push(`${key}: ${value}`);
        }
    }

    for (const [key, value] of Object.entries(user.classifications ?? {})) {
        if (key && value) {
            details.push(`Classification ${key}: ${value}`);
        }
    }

    for (const [key, value] of Object.entries(user.data ?? {})) {
        if (key && value?.value) {
            details.push(`Data ${key}: ${String(value.value)}`);
        }
    }

    return details.length > 0 ? details.join('\n') : 'Anonymous user';
}

export function formatCompanyDetails(company: Company | undefined) {
    if (!company) {
        return 'No company selected.';
    }

    const details: string[] = [`Company ID: ${company.id}`];

    if (company.parent?.id) {
        details.push(`Parent: ${company.parent.id}`);
    }

    for (const [key, value] of Object.entries(company.data ?? {})) {
        if (key && value?.value) {
            details.push(`Data ${key}: ${String(value.value)}`);
        }
    }

    return details.join('\n');
}

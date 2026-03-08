import { Employee } from '../types';

export const sortEmployees = (employees: Employee[]) => {
    return [...employees].sort((a, b) => {
        if (a.role === 'REPRESENTANTE LEGAL' && b.role !== 'REPRESENTANTE LEGAL') return -1;
        if (a.role !== 'REPRESENTANTE LEGAL' && b.role === 'REPRESENTANTE LEGAL') return 1;
        return 0;
    });
};

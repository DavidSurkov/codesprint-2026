import { Prisma } from '@prisma/client';
import { prisma } from '../db/index.js';

export const audit = async (
    requestId: string,
    action: string,
    entity: string,
    entityId: string | null,
    userId: string | null,
    metadata: Record<string, unknown> = {},
) => {
    await prisma.auditLog.create({
        data: {
            action,
            entity,
            entityId,
            userId,
            requestId,
            metadata: metadata as Prisma.InputJsonValue,
        },
    });
};

import { Hono } from 'hono';

import { DownloadDocumentUseCase } from '@/application/usecases/document/download-document.usecase';
import { ListDocumentsUseCase } from '@/application/usecases/document/list-documents.usecase';
import { UploadDocumentUseCase } from '@/application/usecases/document/upload-document.usecase';
import { ERROR_CODES } from '@/constants/error-codes';
import { HTTP_STATUS } from '@/constants/http-status';
import { DomainError } from '@/domain/errors/domain-errors';

import { prisma } from '@/infrastructure/db/prisma.client';
import { CharacterPrismaRepository } from '@/infrastructure/repositories/character.prisma.repository';
import { EmployeePrismaRepository } from '@/infrastructure/repositories/employee.prisma.repository';
import { QuestDocumentPrismaRepository } from '@/infrastructure/repositories/quest-document.prisma.repository';
import { QuestPrismaRepository } from '@/infrastructure/repositories/quest.prisma.repository';
import { getStorageService } from '@/infrastructure/storage';

import { authMiddleware } from '@/presentation/middlewares/auth.middleware';

const employees = () => new EmployeePrismaRepository(prisma);
const characters = () => new CharacterPrismaRepository(prisma);
const quests = () => new QuestPrismaRepository(prisma);
const docs = () => new QuestDocumentPrismaRepository(prisma);

export const documentRoutes = new Hono()
  .use('*', authMiddleware)
  .post('/quests/:questId/documents', async (c) => {
    const sub = c.get('cognitoSub');
    const questId = c.req.param('questId');

    const form = await c.req.parseBody();
    const file = form['file'];
    if (!file || typeof file === 'string' || !(file instanceof File)) {
      throw new DomainError(ERROR_CODES.VALIDATION_FAILED, 'file field is required (multipart/form-data)');
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const usecase = new UploadDocumentUseCase(
      getStorageService(),
      docs(),
      quests(),
      employees(),
      characters(),
    );
    const created = await usecase.execute(sub, {
      questId,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      body: buffer,
    });
    return c.json(created, HTTP_STATUS.CREATED);
  })
  .get('/quests/:questId/documents', async (c) => {
    const sub = c.get('cognitoSub');
    const isAdmin = c.get('isAdmin');
    const questId = c.req.param('questId');
    const usecase = new ListDocumentsUseCase(
      docs(),
      quests(),
      employees(),
      characters(),
    );
    const list = await usecase.execute(sub, isAdmin, questId);
    return c.json(list, HTTP_STATUS.OK);
  })
  .get('/documents/:id/download', async (c) => {
    const sub = c.get('cognitoSub');
    const isAdmin = c.get('isAdmin');
    const id = c.req.param('id');
    const usecase = new DownloadDocumentUseCase(
      getStorageService(),
      docs(),
      employees(),
      characters(),
    );
    const result = await usecase.execute(sub, isAdmin, id);
    return c.json(result, HTTP_STATUS.OK);
  });

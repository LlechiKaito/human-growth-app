import { randomUUID } from 'node:crypto';

import { ADMINS_GROUP, type MeResponse } from '@/application/dto/auth.dto';
import { Employee } from '@/domain/entities/employee.entity';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';

export interface GetMeInput {
  cognitoSub: string;
  email: string;
  displayName: string | null;
  groups: string[];
}

export class GetMeUseCase {
  constructor(private readonly employees: EmployeeRepository) {}

  async execute(input: GetMeInput): Promise<MeResponse> {
    let employee = await this.employees.findByCognitoSub(input.cognitoSub);

    // Cognito 認証は通ったが DB に居ないユーザーは bootstrap
    if (!employee) {
      const now = new Date();
      employee = await this.employees.create(
        Employee.create({
          id: randomUUID(),
          externalId: null,
          cognitoSub: input.cognitoSub,
          email: input.email,
          displayName: input.displayName ?? input.email,
          department: null,
          joinedAt: now,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }

    return {
      id: employee.id,
      email: employee.email,
      displayName: employee.displayName,
      department: employee.department,
      isAdmin: input.groups.includes(ADMINS_GROUP),
    };
  }
}

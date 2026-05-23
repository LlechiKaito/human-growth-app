import { randomUUID } from 'node:crypto';

import type { AuthTokens, SignupInput } from '@/application/dto/auth.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { Employee } from '@/domain/entities/employee.entity';
import { DomainError } from '@/domain/errors/domain-errors';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';

import type { AuthProvider } from '@/infrastructure/auth/auth.provider';

export interface SignupResult {
  employeeId: string;
  tokens: AuthTokens;
}

export class SignupUseCase {
  constructor(
    private readonly auth: AuthProvider,
    private readonly employees: EmployeeRepository,
  ) {}

  async execute(input: SignupInput): Promise<SignupResult> {
    const existing = await this.employees.findByEmail(input.email);
    if (existing) {
      throw new DomainError(ERROR_CODES.CONFLICT, 'Email already registered');
    }

    const { sub, tokens } = await this.auth.signup(input);

    const now = new Date();
    const employee = Employee.create({
      id: randomUUID(),
      externalId: null,
      cognitoSub: sub,
      email: input.email,
      displayName: input.displayName,
      department: input.department ?? null,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const saved = await this.employees.create(employee);

    return { employeeId: saved.id, tokens };
  }
}

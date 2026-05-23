import type { AuthTokens, LoginInput } from '@/application/dto/auth.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { DomainError } from '@/domain/errors/domain-errors';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';

import type { AuthProvider } from '@/infrastructure/auth/auth.provider';

export interface LoginResult {
  employeeId: string;
  tokens: AuthTokens;
}

export class LoginUseCase {
  constructor(
    private readonly auth: AuthProvider,
    private readonly employees: EmployeeRepository,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const { sub, tokens } = await this.auth.login(input);
    const employee = await this.employees.findByCognitoSub(sub);
    if (!employee) {
      throw new DomainError(ERROR_CODES.UNAUTHORIZED, 'Employee record not found');
    }
    return { employeeId: employee.id, tokens };
  }
}

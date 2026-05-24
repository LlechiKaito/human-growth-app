import { randomUUID } from 'node:crypto';

import type { AuthTokens, LoginInput } from '@/application/dto/auth.dto';
import { Employee } from '@/domain/entities/employee.entity';
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

    let employee = await this.employees.findByCognitoSub(sub);

    // Cognito 認証は通ったが Employee がいない場合 = 別環境 (本番 → ローカル等)
    // で signup 済みのユーザー。JWT クレームから Employee を bootstrap する。
    if (!employee) {
      const claims = await this.auth.verify(tokens.idToken);
      const now = new Date();
      employee = await this.employees.create(
        Employee.create({
          id: randomUUID(),
          externalId: null,
          cognitoSub: sub,
          email: claims.email,
          displayName: claims.displayName ?? claims.email,
          department: null,
          joinedAt: now,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }

    return { employeeId: employee.id, tokens };
  }
}

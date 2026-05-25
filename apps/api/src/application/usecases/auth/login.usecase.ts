import { randomUUID } from 'node:crypto';

import type { AuthTokens, LoginInput } from '@/application/dto/auth.dto';
import { Employee } from '@/domain/entities/employee.entity';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';

import type { AuthProvider } from '@/infrastructure/auth/auth.provider';

export interface LoginResult {
  employeeId: string;
  tokens: AuthTokens;
}

/**
 * Cognito 認証通過後に Employee 行が無い場合は JWT claim から自動作成する
 * (Just-In-Time provisioning)。
 *
 * 設計: Cognito を真実、ローカル DB の employees はそのミラー。
 * これにより、本番で signup したユーザーが別環境 (ローカル等) で初めて
 * login するときも詰まらない。SAML フェデレーション追加時にも同じ仕組みで対応可。
 */
export class LoginUseCase {
  constructor(
    private readonly auth: AuthProvider,
    private readonly employees: EmployeeRepository,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const { sub, tokens } = await this.auth.login(input);

    let employee = await this.employees.findByCognitoSub(sub);
    if (!employee) {
      employee = await bootstrapEmployee(this.employees, {
        cognitoSub: sub,
        email: input.email,
        displayName: deriveDisplayName(input.email),
      });
    }
    return { employeeId: employee.id, tokens };
  }
}

/** メアドのローカル部 (\@ より前) を仮の displayName とする */
const deriveDisplayName = (email: string): string => {
  const local = email.split('@')[0] ?? email;
  return local.slice(0, 50) || email;
};

export const bootstrapEmployee = async (
  employees: EmployeeRepository,
  params: { cognitoSub: string; email: string; displayName: string },
): Promise<Employee> => {
  const now = new Date();
  const employee = Employee.create({
    id: randomUUID(),
    externalId: null,
    cognitoSub: params.cognitoSub,
    email: params.email,
    displayName: params.displayName,
    department: null,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  return employees.create(employee);
};

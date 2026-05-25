import { ADMINS_GROUP, type MeResponse } from '@/application/dto/auth.dto';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';

import { bootstrapEmployee } from '@/application/usecases/auth/login.usecase';

/**
 * 認証通過後の `/api/auth/me`。Employee が無ければ JIT bootstrap で作成する。
 * これにより、login を経由せずに idToken を持ち込んだ場合 (例: refresh, SAML SSO 直入り)
 * もエラーにならない。
 */
export class GetMeUseCase {
  constructor(private readonly employees: EmployeeRepository) {}

  async execute(cognitoSub: string, email: string, groups: string[]): Promise<MeResponse> {
    let employee = await this.employees.findByCognitoSub(cognitoSub);
    if (!employee) {
      employee = await bootstrapEmployee(this.employees, {
        cognitoSub,
        email,
        displayName: email.split('@')[0]?.slice(0, 50) || email,
      });
    }
    return {
      id: employee.id,
      email: employee.email,
      displayName: employee.displayName,
      department: employee.department,
      isAdmin: groups.includes(ADMINS_GROUP),
    };
  }
}

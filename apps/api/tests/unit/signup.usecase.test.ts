import { beforeEach, describe, expect, it } from 'vitest';

import { SignupUseCase } from '@/application/usecases/auth/signup.usecase';
import type { Employee } from '@/domain/entities/employee.entity';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';
import { LocalAuthProvider } from '@/infrastructure/auth/local-auth.provider';

class InMemoryEmployeeRepository implements EmployeeRepository {
  private byId = new Map<string, Employee>();
  private byCognitoSub = new Map<string, Employee>();
  private byEmail = new Map<string, Employee>();

  async findById(id: string): Promise<Employee | null> {
    return this.byId.get(id) ?? null;
  }
  async findByCognitoSub(sub: string): Promise<Employee | null> {
    return this.byCognitoSub.get(sub) ?? null;
  }
  async findByEmail(email: string): Promise<Employee | null> {
    return this.byEmail.get(email) ?? null;
  }
  async create(employee: Employee): Promise<Employee> {
    this.byId.set(employee.id, employee);
    this.byCognitoSub.set(employee.cognitoSub, employee);
    this.byEmail.set(employee.email, employee);
    return employee;
  }
}

describe('SignupUseCase', () => {
  let provider: LocalAuthProvider;
  let repo: InMemoryEmployeeRepository;
  let usecase: SignupUseCase;

  beforeEach(() => {
    provider = new LocalAuthProvider('test-secret-key-with-enough-length-1234');
    repo = new InMemoryEmployeeRepository();
    usecase = new SignupUseCase(provider, repo);
  });

  it('creates an employee and returns tokens', async () => {
    const result = await usecase.execute({
      email: 'new@example.com',
      password: 'password123',
      displayName: 'New User',
      department: 'Engineering',
    });
    expect(result.employeeId).toBeTypeOf('string');
    expect(result.tokens.idToken).toBeTypeOf('string');
    const stored = await repo.findByEmail('new@example.com');
    expect(stored?.displayName).toBe('New User');
    expect(stored?.department).toBe('Engineering');
  });

  it('throws when email already exists in DB', async () => {
    await usecase.execute({
      email: 'dup@example.com',
      password: 'password123',
      displayName: 'Dup',
    });
    await expect(
      usecase.execute({
        email: 'dup@example.com',
        password: 'password123',
        displayName: 'Dup2',
      }),
    ).rejects.toThrow(/already registered/);
  });
});

export interface EmployeeProps {
  id: string;
  externalId: string | null;
  cognitoSub: string;
  email: string;
  displayName: string;
  department: string | null;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Employee {
  private constructor(private readonly props: EmployeeProps) {}

  static create(props: EmployeeProps): Employee {
    return new Employee(props);
  }

  get id(): string {
    return this.props.id;
  }

  get externalId(): string | null {
    return this.props.externalId;
  }

  get cognitoSub(): string {
    return this.props.cognitoSub;
  }

  get email(): string {
    return this.props.email;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get department(): string | null {
    return this.props.department;
  }

  get joinedAt(): Date {
    return this.props.joinedAt;
  }
}

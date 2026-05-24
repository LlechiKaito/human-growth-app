export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface QuestDocumentProps {
  id: string;
  questId: string;
  uploadedByCharacterId: string;
  s3Key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  reviewedByEmployeeId: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class QuestDocument {
  private constructor(private readonly props: QuestDocumentProps) {}

  static create(props: QuestDocumentProps): QuestDocument {
    return new QuestDocument(props);
  }

  get id(): string { return this.props.id; }
  get questId(): string { return this.props.questId; }
  get uploadedByCharacterId(): string { return this.props.uploadedByCharacterId; }
  get s3Key(): string { return this.props.s3Key; }
  get filename(): string { return this.props.filename; }
  get mimeType(): string { return this.props.mimeType; }
  get sizeBytes(): number { return this.props.sizeBytes; }
  get status(): DocumentStatus { return this.props.status; }
  get reviewedByEmployeeId(): string | null { return this.props.reviewedByEmployeeId; }
  get reviewedAt(): Date | null { return this.props.reviewedAt; }
  get rejectionReason(): string | null { return this.props.rejectionReason; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
}

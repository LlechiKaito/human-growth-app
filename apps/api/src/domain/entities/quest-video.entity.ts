export interface QuestVideoProps {
  id: string;
  questId: string;
  s3Key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByEmployeeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class QuestVideo {
  private constructor(private props: QuestVideoProps) {}
  static create(p: QuestVideoProps): QuestVideo {
    return new QuestVideo(p);
  }
  get id(): string { return this.props.id; }
  get questId(): string { return this.props.questId; }
  get s3Key(): string { return this.props.s3Key; }
  get filename(): string { return this.props.filename; }
  get mimeType(): string { return this.props.mimeType; }
  get sizeBytes(): number { return this.props.sizeBytes; }
  get uploadedByEmployeeId(): string { return this.props.uploadedByEmployeeId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
}

export interface QuestVideoViewProps {
  questId: string;
  characterId: string;
  viewedAt: Date;
}

export class QuestVideoView {
  private constructor(private props: QuestVideoViewProps) {}
  static create(p: QuestVideoViewProps): QuestVideoView {
    return new QuestVideoView(p);
  }
  get questId(): string { return this.props.questId; }
  get characterId(): string { return this.props.characterId; }
  get viewedAt(): Date { return this.props.viewedAt; }
}

export interface QuestVideoMetaDto {
  id: string;
  questId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

/** 受講者向け: メタデータ + 視聴用 presigned URL */
export interface QuestVideoForViewerDto extends QuestVideoMetaDto {
  url: string;
  /** ログイン中のキャラクターが視聴済みかどうか */
  viewed: boolean;
}

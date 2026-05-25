export interface QuestChoiceProps {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export class QuestChoice {
  private constructor(private props: QuestChoiceProps) {}
  static create(p: QuestChoiceProps): QuestChoice {
    return new QuestChoice(p);
  }
  get id(): string { return this.props.id; }
  get text(): string { return this.props.text; }
  get isCorrect(): boolean { return this.props.isCorrect; }
  get order(): number { return this.props.order; }
}

export interface QuestQuestionProps {
  id: string;
  questId: string;
  text: string;
  order: number;
  choices: QuestChoice[];
}

export class QuestQuestion {
  private constructor(private props: QuestQuestionProps) {}
  static create(p: QuestQuestionProps): QuestQuestion {
    return new QuestQuestion(p);
  }
  get id(): string { return this.props.id; }
  get questId(): string { return this.props.questId; }
  get text(): string { return this.props.text; }
  get order(): number { return this.props.order; }
  get choices(): QuestChoice[] { return this.props.choices; }

  correctChoice(): QuestChoice | undefined {
    return this.props.choices.find((c) => c.isCorrect);
  }

  isAnswerCorrect(choiceId: string): boolean {
    const correct = this.correctChoice();
    return !!correct && correct.id === choiceId;
  }
}

export interface QuestTestAttemptProps {
  id: string;
  questId: string;
  characterId: string;
  score: number;
  total: number;
  passed: boolean;
  submittedAt: Date;
}

export class QuestTestAttempt {
  private constructor(private props: QuestTestAttemptProps) {}
  static create(p: QuestTestAttemptProps): QuestTestAttempt {
    return new QuestTestAttempt(p);
  }
  get id(): string { return this.props.id; }
  get questId(): string { return this.props.questId; }
  get characterId(): string { return this.props.characterId; }
  get score(): number { return this.props.score; }
  get total(): number { return this.props.total; }
  get passed(): boolean { return this.props.passed; }
  get submittedAt(): Date { return this.props.submittedAt; }
}

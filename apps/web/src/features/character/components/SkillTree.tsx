import type { SkillNodeDto } from '@/features/character/api';

interface SkillNodeWithChildren extends SkillNodeDto {
  children: SkillNodeWithChildren[];
}

const buildTree = (skills: SkillNodeDto[]): SkillNodeWithChildren[] => {
  const byId = new Map<string, SkillNodeWithChildren>(
    skills.map((s) => [s.id, { ...s, children: [] }]),
  );
  const roots: SkillNodeWithChildren[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
};

const SkillNode = ({ node, depth }: { node: SkillNodeWithChildren; depth: number }) => (
  <div className="flex flex-col gap-2" style={{ marginLeft: depth * 16 }}>
    <div
      className={
        node.acquired
          ? 'rounded border border-rpg-xp bg-rpg-card px-3 py-2'
          : 'rounded border border-gray-700 bg-rpg-card px-3 py-2 opacity-60'
      }
      data-testid={`skill-${node.code}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={
            node.acquired ? 'text-rpg-xp' : 'text-gray-500'
          }
        >
          {node.acquired ? '◆' : '◇'}
        </span>
        <span className="font-semibold">{node.name}</span>
        <span className="text-xs text-gray-500">Tier {node.tier}</span>
      </div>
      <p className="mt-1 text-xs text-gray-400">{node.description}</p>
    </div>
    {node.children.map((child) => (
      <SkillNode key={child.id} node={child} depth={depth + 1} />
    ))}
  </div>
);

export const SkillTree = ({ skills }: { skills: SkillNodeDto[] }) => {
  const tree = buildTree(skills);
  if (tree.length === 0) {
    return <p className="text-sm text-gray-500">スキルが登録されていません</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {tree.map((root) => (
        <SkillNode key={root.id} node={root} depth={0} />
      ))}
    </div>
  );
};

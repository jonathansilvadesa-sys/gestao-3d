interface BadgeProps {
  v: string;
  bg?: string;
}

export function Badge({ v, bg = '#6366f1' }: BadgeProps) {
  return (
    <span
      style={{
        background: bg, color: '#fff',
        padding: '2px 10px', borderRadius: 999,
        fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
      }}
    >
      {v}
    </span>
  );
}

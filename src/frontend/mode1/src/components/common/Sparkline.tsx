import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

export function Sparkline({ data, color = '#35b7ad' }: { data: number[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data.map((value, index) => ({ index, value }))}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        <YAxis hide domain={['dataMin - 3', 'dataMax + 3']} />
        <XAxis hide dataKey="index" />
      </LineChart>
    </ResponsiveContainer>
  );
}

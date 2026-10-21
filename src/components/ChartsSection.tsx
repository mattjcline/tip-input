import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getCategoryBreakdown, getSourceAverages, getTrend, getWeekdayAverages, type AveragePoint } from '../lib/chartData';
import type { Tip } from '../types';

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function useChartColors() {
  const read = () => {
    const style = getComputedStyle(document.documentElement);
    return {
      tips: style.getPropertyValue('--accent').trim(),
      wages: style.getPropertyValue('--chart-wages').trim(),
      muted: style.getPropertyValue('--text-muted').trim(),
      border: style.getPropertyValue('--border').trim(),
    };
  };
  const [colors, setColors] = useState(read);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setColors(read());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return colors;
}

interface Props {
  // Already narrowed to the selected date range (and source) by the caller.
  tips: Tip[];
  dateFilter: string;
  periodLabel: string;
}

export function ChartsSection({ tips, dateFilter, periodLabel }: Props) {
  const colors = useChartColors();
  const trend = getTrend(tips, dateFilter);
  const breakdown = getCategoryBreakdown(tips);
  const weekdayAverages = getWeekdayAverages(tips);
  // ponytail: top 8 only, keeps the chart phone-sized; scroll/expand if more matter.
  const sourceAverages = getSourceAverages(tips).slice(0, 8);

  const tick = { fill: colors.muted, fontSize: 11 };
  const averageTooltip = (
    <Tooltip
      formatter={(value, _name, item) => [
        `${formatCurrency(Number(value))} (${(item.payload as AveragePoint).days} days)`,
        'Avg per day',
      ]}
      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
    />
  );

  return (
    <div className="charts-section">
      <div className="charts-section__chart">
        <h2 className="charts-section__title">Tips - {periodLabel}</h2>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={colors.border} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: colors.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: colors.border }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: colors.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(value: number) => `$${Math.round(value)}`}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
            />
            <Area type="monotone" dataKey="total" stroke={colors.tips} fill={colors.tips} fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="charts-section__chart">
        <h2 className="charts-section__title">Tips vs Wages - {periodLabel}</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={breakdown} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="category" tick={{ fill: colors.muted, fontSize: 12 }} tickLine={false} axisLine={{ stroke: colors.border }} />
            <YAxis hide />
            <Bar dataKey="total" radius={[6, 6, 0, 0]}>
              {breakdown.map((entry) => (
                <Cell key={entry.category} fill={entry.category === 'Tips' ? colors.tips : colors.wages} />
              ))}
              <LabelList
                dataKey="total"
                position="top"
                content={({ x, y, width, value }) => (
                  <text
                    x={Number(x) + Number(width) / 2}
                    y={Number(y) - 6}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill="var(--text)"
                  >
                    {formatCurrency(Number(value))}
                  </text>
                )}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="charts-section__chart">
        <h2 className="charts-section__title">Avg tips by weekday - {periodLabel}</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weekdayAverages} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={colors.border} vertical={false} />
            <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={{ stroke: colors.border }} />
            <YAxis
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(value: number) => `$${Math.round(value)}`}
            />
            {averageTooltip}
            <Bar dataKey="average" fill={colors.tips} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {sourceAverages.length > 1 && (
        <div className="charts-section__chart">
          <h2 className="charts-section__title">Avg tips by source - {periodLabel}</h2>
          <ResponsiveContainer width="100%" height={sourceAverages.length * 32 + 16}>
            <BarChart data={sourceAverages} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" tick={tick} tickLine={false} axisLine={false} width={96} />
              {averageTooltip}
              <Bar dataKey="average" fill={colors.tips} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

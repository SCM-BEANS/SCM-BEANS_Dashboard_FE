"use client";

import { useState, useMemo } from "react";
import { useIoTStore } from "@/store/useIoTStore";
import { useI18nStore } from "@/store/useI18nStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type TimeRange = "day" | "week" | "month" | "year";

export const AnalyticsWidget = () => {
  const { analytics } = useIoTStore();
  const { t } = useI18nStore();
  const [range, setRange] = useState<TimeRange>("week");

  // Get current data based on range
  const data = analytics[range];

  // Calculate total cups in this range
  const totalCups = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.cups, 0);
  }, [data]);

  // Find the peak time/day
  const peak = useMemo(() => {
    let max = data[0];
    for (const d of data) {
      if (d.cups > max.cups) max = d;
    }
    return max;
  }, [data]);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end border-b-2 border-outline pb-2 gap-4">
        <div className="text-xl font-bold uppercase text-primary">{t("analytics")}</div>
        
        {/* Toggle Switch */}
        <div className="flex bg-surface-container border-2 border-outline rounded-sm p-1">
          {(["day", "week", "month", "year"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 font-mono text-xs uppercase font-bold transition-colors ${
                range === r
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {t(r as any)}
            </button>
          ))}
        </div>
      </div>

      <div className="bento-border p-6 flex flex-col md:flex-row gap-8 bg-surface-container-lowest">
        
        {/* Left Side: Summary Stats */}
        <div className="flex flex-col gap-6 md:w-1/4">
          <div>
            <div className="font-mono text-xs uppercase text-on-surface-variant mb-1">{t("total_cups")}</div>
            <div className="text-4xl font-bold text-primary">{totalCups.toLocaleString("en-US")}</div>
          </div>
          <div>
            <div className="font-mono text-xs uppercase text-on-surface-variant mb-1">{t("peak_brewing_time")}</div>
            <div className="text-3xl font-light text-secondary">{peak.label}</div>
            <div className="text-sm font-mono text-on-surface-variant uppercase mt-1">
              {peak.cups} {t("total_cups").split(' ')[1] || 'Cups'}
            </div>
          </div>
        </div>

        {/* Right Side: Chart */}
        <div className="h-64 md:h-80 w-full md:w-3/4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eeeeee" />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "#666666", fontSize: 12, fontFamily: "monospace" }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "#666666", fontSize: 12, fontFamily: "monospace" }}
              />
              <Tooltip 
                cursor={{ fill: '#f4f4f4' }}
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '2px solid #000000',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase'
                }}
                itemStyle={{ color: '#000000', fontWeight: 'bold' }}
              />
              <Bar dataKey="cups" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.cups === peak.cups ? '#000000' : '#cccccc'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
      </div>
    </section>
  );
};

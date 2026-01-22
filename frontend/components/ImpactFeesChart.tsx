"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type Point = { label: string; cumulativeFeeUsdc: number };

export function ImpactFeesChart({ points }: { points: Point[] }) {
  const data = {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label: "Fees cumulées (USDC)",
        data: points.map((p) => p.cumulativeFeeUsdc),
        borderColor: "rgba(96, 165, 250, 1)", // blue-400
        backgroundColor: "rgba(96, 165, 250, 0.2)",
        pointRadius: 0,
        tension: 0.25,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${Number(ctx.parsed.y).toFixed(4)} USDC`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "rgba(156, 163, 175, 1)",
          maxTicksLimit: 6,
          callback: (v: any, i: number) => {
            const label = (points[i]?.label ?? "").replace("…", "");
            return label ? `#${label}` : "";
          },
        }, // gray-400
        grid: { color: "rgba(55, 65, 81, 0.6)" }, // gray-700
      },
      y: {
        ticks: {
          color: "rgba(156, 163, 175, 1)",
          callback: (v: any) => Number(v).toFixed(3),
        },
        grid: { color: "rgba(55, 65, 81, 0.6)" },
      },
    },
  };

  return (
    <div className="h-56">
      <Line data={data} options={options} />
    </div>
  );
}


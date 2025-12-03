import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from "chart.js";
import { useMemo } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface EventVoteChartProps {
  yesVotes: number;
  noVotes: number;
  outcome?: "YES" | "NO";
  userBet?: "YES" | "NO";
}

export function EventVoteChart({ yesVotes, noVotes, outcome, userBet }: EventVoteChartProps) {
  const total = yesVotes + noVotes;
  const yesPercentage = total > 0 ? Math.round((yesVotes / total) * 100) : 0;
  const noPercentage = total > 0 ? Math.round((noVotes / total) * 100) : 0;

  const data: ChartData<"bar"> = useMemo(() => {
    // Determine colors based on outcome and user bet
    const yesBaseColor = "rgba(16, 185, 129, 0.6)"; // Green
    const noBaseColor = "rgba(239, 68, 68, 0.6)";   // Red
    const userBetBorder = "rgba(59, 130, 246, 1)";  // Blue border for user bet

    let yesColor = yesBaseColor;
    let noColor = noBaseColor;
    let yesBorder = "transparent";
    let noBorder = "transparent";

    // Highlight winner if outcome exists
    if (outcome === "YES") {
      yesColor = "rgba(16, 185, 129, 1)";
      noColor = "rgba(239, 68, 68, 0.3)";
    } else if (outcome === "NO") {
      yesColor = "rgba(16, 185, 129, 0.3)";
      noColor = "rgba(239, 68, 68, 1)";
    }

    // Highlight user bet
    if (userBet === "YES") yesBorder = userBetBorder;
    if (userBet === "NO") noBorder = userBetBorder;

    return {
      labels: ["YES", "NO"],
      datasets: [
        {
          label: "Votes",
          data: [yesVotes, noVotes],
          backgroundColor: [yesColor, noColor],
          borderColor: [yesBorder, noBorder],
          borderWidth: userBet ? 3 : 0,
          borderRadius: 4,
          barThickness: 40,
        },
      ],
    };
  }, [yesVotes, noVotes, outcome, userBet]);

  const options: ChartOptions<"bar"> = {
    indexAxis: 'y', // Horizontal bar chart for better mobile fit
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0,0,0,0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        callbacks: {
            label: (context) => {
                const value = context.raw as number;
                const p = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${value.toLocaleString()} Votes (${p}%)`;
            }
        }
      },
    },
    scales: {
      x: {
        display: false, // Hide X axis labels
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          display: false, // Hide Y axis grid lines
        },
        ticks: {
          color: "#9ca3af",
          font: {
            family: "'JetBrains Mono', monospace",
            weight: "bold",
          },
        },
      },
    },
    animation: {
      duration: 1000,
      easing: "easeOutQuart",
    },
  };

  return (
    <div className="w-full h-24 relative">
        {/* Overlay percentages */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-around pl-12 pr-2 text-xs font-mono font-bold text-white mix-blend-difference z-10">
            <div className="flex justify-between w-full">
                <span></span>
                <span>{yesPercentage}%</span>
            </div>
            <div className="flex justify-between w-full">
                <span></span>
                <span>{noPercentage}%</span>
            </div>
        </div>
      <Bar data={data} options={options} />
    </div>
  );
}

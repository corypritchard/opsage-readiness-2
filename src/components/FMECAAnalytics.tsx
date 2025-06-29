import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface FMECAAnalyticsProps {
  data: any[];
  columns: string[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function FMECAAnalytics({ data, columns }: FMECAAnalyticsProps) {
  if (!data.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-gray-500">
          No data available for analytics
        </CardContent>
      </Card>
    );
  }

  // Calculate analytics
  const analytics = {
    totalEntries: data.length,
    uniqueAssetTypes: [
      ...new Set(data.map((row) => row["Asset Type"]).filter(Boolean)),
    ],
    uniqueComponents: [
      ...new Set(data.map((row) => row["Component"]).filter(Boolean)),
    ],
    severityDistribution: data.reduce((acc, row) => {
      const severity = row["Overall Severity Level"];
      if (severity) {
        acc[severity] = (acc[severity] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
    assetTypeDistribution: data.reduce((acc, row) => {
      const assetType = row["Asset Type"];
      if (assetType) {
        acc[assetType] = (acc[assetType] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
    highRiskItems: data.filter((row) => {
      const severity = parseInt(row["Overall Severity Level"] || "0");
      return severity >= 4;
    }).length,
    missingData: data.filter((row) => {
      return !row["Asset Type"] || !row["Component"] || !row["Failure Modes"];
    }).length,
  };

  // Prepare chart data
  const severityChartData = Object.entries(analytics.severityDistribution).map(
    ([level, count]) => ({
      level: `Level ${level}`,
      count,
      color: COLORS[parseInt(level) - 1] || COLORS[0],
    })
  );

  const assetTypeChartData = Object.entries(analytics.assetTypeDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([type, count]) => ({
      type,
      count,
    }));

  const pieData = [
    {
      name: "High Risk (4-5)",
      value: analytics.highRiskItems,
      color: "#ef4444",
    },
    {
      name: "Medium Risk (2-3)",
      value: data.length - analytics.highRiskItems - analytics.missingData,
      color: "#f59e0b",
    },
    { name: "Missing Data", value: analytics.missingData, color: "#6b7280" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Entries
                </p>
                <p className="text-2xl font-bold">{analytics.totalEntries}</p>
              </div>
              <Badge variant="outline">
                {analytics.uniqueAssetTypes.length} Asset Types
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  High Risk Items
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {analytics.highRiskItems}
                </p>
              </div>
              <Badge variant="destructive" className="text-xs">
                {(
                  (analytics.highRiskItems / analytics.totalEntries) *
                  100
                ).toFixed(1)}
                %
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Unique Components
                </p>
                <p className="text-2xl font-bold">
                  {analytics.uniqueComponents.length}
                </p>
              </div>
              <Badge variant="outline">Components</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Data Quality
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {(
                    ((analytics.totalEntries - analytics.missingData) /
                      analytics.totalEntries) *
                    100
                  ).toFixed(1)}
                  %
                </p>
              </div>
              <Badge
                variant={analytics.missingData > 0 ? "secondary" : "default"}
              >
                {analytics.missingData} missing
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Severity Level Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={severityChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Asset Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Asset Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={assetTypeChartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="type" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk Overview Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Risk Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Data Quality Insights */}
      {analytics.missingData > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg text-yellow-800">
              Data Quality Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-yellow-700">
                <strong>{analytics.missingData}</strong> entries are missing
                required data fields.
              </p>
              <p className="text-sm text-yellow-600">
                Consider using the AI assistant to help complete missing
                information or validate existing entries.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg text-blue-800">
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.highRiskItems > 0 && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-blue-700">
                  <strong>{analytics.highRiskItems} high-risk items</strong>{" "}
                  detected. Consider generating detailed maintenance tasks for
                  these critical components.
                </p>
              </div>
            )}

            {analytics.missingData > 0 && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-blue-700">
                  <strong>{analytics.missingData} entries</strong> have missing
                  data. Ask the AI to help complete missing fields or validate
                  existing entries.
                </p>
              </div>
            )}

            {analytics.uniqueAssetTypes.length > 5 && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-blue-700">
                  <strong>
                    {analytics.uniqueAssetTypes.length} asset types
                  </strong>{" "}
                  identified. Consider asking the AI to analyze patterns across
                  different asset categories.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

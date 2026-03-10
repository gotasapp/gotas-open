'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, CheckCircle, Clock, Zap, Database, RefreshCw } from 'lucide-react';

interface PerformanceMetric {
  strategy: string;
  executionTime: number;
  resultCount: number;
  cacheHit: boolean;
  timestamp: Date;
}

interface QueryPlan {
  strategy: string;
  estimatedCost: number;
  actualTime: number;
  rowsScanned: number;
  indexUsed: string;
}

export default function QueryPerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [queryPlans, setQueryPlans] = useState<QueryPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('summary');

  const strategies = [
    { value: 'summary', label: 'Summary Table', color: 'green', icon: Zap },
    { value: 'materialized', label: 'Materialized View', color: 'blue', icon: Database },
    { value: 'optimized', label: 'Optimized Query', color: 'yellow', icon: Clock },
    { value: 'cached', label: 'Cached', color: 'purple', icon: RefreshCw },
  ];

  // Test query performance with different strategies
  const testPerformance = async (strategy: string) => {
    setIsLoading(true);
    const startTime = performance.now();

    try {
      const response = await fetch(`/api/top-collectors?strategy=${strategy}&limit=10`);
      const data = await response.json();

      const endTime = performance.now();
      const executionTime = Math.round(endTime - startTime);

      const metric: PerformanceMetric = {
        strategy,
        executionTime,
        resultCount: data.collectors?.length || 0,
        cacheHit: strategy === 'cached' && executionTime < 50,
        timestamp: new Date(),
      };

      setMetrics(prev => [metric, ...prev.slice(0, 19)]);
    } catch (error) {
      console.error('Performance test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Run performance comparison
  const runComparison = async () => {
    setIsLoading(true);
    setMetrics([]);

    for (const strategy of strategies) {
      await testPerformance(strategy.value);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between tests
    }

    setIsLoading(false);
  };

  // Get query execution plan
  const getQueryPlan = async (strategy: string) => {
    try {
      const response = await fetch(`/api/admin/query-plan?strategy=${strategy}`);
      const plan = await response.json();
      setQueryPlans(prev => [...prev, plan]);
    } catch (error) {
      console.error('Failed to get query plan:', error);
    }
  };

  // Calculate average execution time for each strategy
  const getAverageTime = (strategy: string) => {
    const strategyMetrics = metrics.filter(m => m.strategy === strategy);
    if (strategyMetrics.length === 0) return 0;
    const sum = strategyMetrics.reduce((acc, m) => acc + m.executionTime, 0);
    return Math.round(sum / strategyMetrics.length);
  };

  // Get performance status color
  const getPerformanceStatus = (time: number) => {
    if (time < 100) return { color: 'green', icon: CheckCircle, label: 'Excellent' };
    if (time < 500) return { color: 'blue', icon: CheckCircle, label: 'Good' };
    if (time < 1000) return { color: 'yellow', icon: AlertCircle, label: 'Fair' };
    return { color: 'red', icon: AlertCircle, label: 'Poor' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Query Performance Monitor</span>
            <div className="flex gap-2">
              <Button
                onClick={runComparison}
                disabled={isLoading}
                size="sm"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Run Comparison
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Strategy Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {strategies.map(strategy => {
          const avgTime = getAverageTime(strategy.value);
          const status = getPerformanceStatus(avgTime);
          const Icon = strategy.icon;
          const StatusIcon = status.icon;

          return (
            <Card key={strategy.value}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{strategy.label}</span>
                  </div>
                  <StatusIcon className={`w-4 h-4 text-${status.color}-500`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {avgTime > 0 ? `${avgTime}ms` : '--'}
                  </div>
                  <Badge variant={avgTime === 0 ? 'secondary' : status.color as any}>
                    {avgTime === 0 ? 'No data' : status.label}
                  </Badge>
                  <Button
                    onClick={() => testPerformance(strategy.value)}
                    disabled={isLoading}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance History */}
      <Card>
        <CardHeader>
          <CardTitle>Performance History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Strategy</TableHead>
                <TableHead>Execution Time</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>Cache Hit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No performance data yet. Run comparison to see results.
                  </TableCell>
                </TableRow>
              ) : (
                metrics.map((metric, idx) => {
                  const status = getPerformanceStatus(metric.executionTime);
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <Badge variant="outline">
                          {strategies.find(s => s.value === metric.strategy)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{metric.executionTime}ms</TableCell>
                      <TableCell>{metric.resultCount}</TableCell>
                      <TableCell>
                        {metric.cacheHit ? (
                          <Badge variant="green">Hit</Badge>
                        ) : (
                          <Badge variant="secondary">Miss</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.color as any}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Use Summary Table Strategy</p>
                  <p className="text-sm text-muted-foreground">
                    Provides fastest query times (~30ms) with real-time updates via triggers.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Database className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Materialized View for Large Scale</p>
                  <p className="text-sm text-muted-foreground">
                    Better for very large datasets with less frequent updates (~50ms).
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <RefreshCw className="w-5 h-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium">Enable Caching for Static Periods</p>
                  <p className="text-sm text-muted-foreground">
                    Use 5-minute cache during low activity periods for ~5ms response times.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Chart({ title, description, children, className = '' }: ChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

interface BarChartProps {
  data: Array<{ name: string; value: number; percentage?: number; color?: string }>;
  className?: string;
  height?: number;
  onBarClick?: (item: { name: string; value: number; percentage?: number; color?: string }) => void;
}

export function BarChart({ data, className = '', height = 200, onBarClick }: BarChartProps) {
  const maxValue = Math.max(...data.map(item => item.value));

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <div className="flex items-end justify-between h-full space-x-2">
        {data.map((item, index) => {
          const heightPercentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          
          return (
            <div key={index} className="flex flex-col items-center flex-1 h-full">
              <div className="flex flex-col justify-end h-full w-full px-1">
                <div 
                  className={`${item.color || 'bg-blue-500'} rounded-t transition-all duration-300 hover:opacity-80 hover:scale-105 min-h-[4px] flex items-end justify-center ${onBarClick ? 'cursor-pointer' : ''}`}
                  style={{ height: `${heightPercentage}%` }}
                  onClick={() => onBarClick?.(item)}
                  title={onBarClick ? `Clique para filtrar por ${item.name}` : undefined}
                >
                  <span className="text-xs text-white font-medium mb-1">
                    {item.value}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs text-center text-gray-600 max-w-full">
                <div className="truncate" title={item.name}>{item.name}</div>
                {item.percentage !== undefined && (
                  <div className="text-gray-400">({item.percentage.toFixed(1)}%)</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PieChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  className?: string;
  size?: number;
}

export function PieChart({ data, className = '', size = 200 }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: size }}>
        <span className="text-gray-400">Sem dados disponíveis</span>
      </div>
    );
  }

  let currentAngle = 0;
  const center = size / 2;
  const radius = size / 2 - 10;

  return (
    <div className={`flex items-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const angle = (item.value / total) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          
          const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
          const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
          const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
          const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
          
          const largeArcFlag = angle > 180 ? 1 : 0;
          
          const pathData = [
            `M ${center} ${center}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');
          
          currentAngle += angle;
          
          return (
            <path
              key={index}
              d={pathData}
              fill={item.color}
              stroke="white"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity"
            />
          );
        })}
      </svg>
      
      <div className="ml-4 space-y-2">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          return (
            <div key={index} className="flex items-center text-sm">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-700">
                {item.name}: {item.value} ({percentage.toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface LineChartProps {
  data: Array<{ name: string; value: number }>;
  className?: string;
  height?: number;
}

export function LineChart({ data, className = '', height = 200 }: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <span className="text-gray-400">Sem dados disponíveis</span>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item.value));
  const minValue = Math.min(...data.map(item => item.value));
  const valueRange = maxValue - minValue;
  
  const width = 400;
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  
  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = valueRange > 0 
      ? padding + chartHeight - ((item.value - minValue) / valueRange) * chartHeight
      : padding + chartHeight / 2;
    return { x, y, value: item.value, name: item.name };
  });
  
  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  return (
    <div className={className}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = padding + ratio * chartHeight;
          return (
            <line
              key={index}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          );
        })}
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          className="drop-shadow-sm"
        />
        
        {/* Points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#3b82f6"
            stroke="white"
            strokeWidth="2"
            className="hover:r-6 transition-all"
          />
        ))}
        
        {/* Labels */}
        {points.map((point, index) => (
          <text
            key={index}
            x={point.x}
            y={height - 10}
            textAnchor="middle"
            className="text-xs fill-gray-600"
          >
            {point.name}
          </text>
        ))}
      </svg>
    </div>
  );
}
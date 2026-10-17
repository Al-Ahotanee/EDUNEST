import React from 'react';

interface Props {
  title: string;
  icon?: React.ReactNode;
  message?: string;
}

export default function PlaceholderPage({ title, icon, message }: Props) {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        {icon && <div className="text-gray-200 flex justify-center mb-4">{icon}</div>}
        <h2 className="text-2xl font-bold text-gray-600 mb-2">{title}</h2>
        <p className="text-gray-400">{message || 'This page is under construction.'}</p>
      </div>
    </div>
  );
}

import React from 'react';

export default function PromotionsPage() {
  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div>
        <h1 className="page-title">Student Promotions</h1>
        <p className="page-subtitle">Promote, hold back, or graduate students for the next academic session</p>
      </div>
      <div className="card p-6">
        <p className="text-sm text-slate-600">
          Promotions module loaded successfully. This is a minimal placeholder while data fetching is being stabilized.
        </p>
      </div>
    </div>
  );
}

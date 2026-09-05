import React from 'react';
import { useParams } from 'react-router-dom';

export default function TokenWeighingPage() {
  const { tokenNumber } = useParams();
  return (
    <div className="page-container">
      <h1>Weighing Station Placeholder: Token #{tokenNumber}</h1>
      <p>Manual Weight Entry & Verification</p>
    </div>
  );
}

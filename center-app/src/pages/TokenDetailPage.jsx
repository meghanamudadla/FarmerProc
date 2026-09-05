import React from 'react';
import { useParams } from 'react-router-dom';

export default function TokenDetailPage() {
  const { tokenNumber } = useParams();
  return (
    <div className="page-container">
      <h1>Token Details Placeholder: #{tokenNumber}</h1>
      <p>Farmer Token Details and Operational History</p>
    </div>
  );
}

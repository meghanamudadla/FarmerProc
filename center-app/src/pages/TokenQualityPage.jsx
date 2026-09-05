import React from 'react';
import { useParams } from 'react-router-dom';

export default function TokenQualityPage() {
  const { tokenNumber } = useParams();
  return (
    <div className="page-container">
      <h1>Quality Check Placeholder: Token #{tokenNumber}</h1>
      <p>Moisture %, Foreign Matter % & Grade Inspection</p>
    </div>
  );
}

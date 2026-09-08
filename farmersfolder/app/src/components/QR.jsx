import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QR({ value, size = 132 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 1 }, () => {});
    }
  }, [value, size]);

  return <canvas ref={canvasRef} />;
}

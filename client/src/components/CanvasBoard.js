// Canvas component (§26.ii) — a drawing pad. Draw with the mouse, pick colors
// and brush size, then attach the drawing to a post as an image.
import { useEffect, useRef, useState } from 'react';

const COLORS = ['#1c1e21', '#e11d48', '#f59e0b', '#16a34a', '#2563eb', '#7c3aed', '#ffffff'];

function CanvasBoard({ onAttach, onClose }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(4);

  // Start with a white background (so the exported PNG isn't transparent).
  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  // Mouse position in canvas coordinates (canvas is scaled by CSS).
  function pos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvasRef.current.width) / rect.width,
      y: ((e.clientY - rect.top) * canvasRef.current.height) / rect.height,
    };
  }

  function start(e) {
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(e) {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const p = pos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
  }

  return (
    <div className="canvas-board">
      <canvas
        ref={canvasRef}
        width={560}
        height={320}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
      />
      <div className="row">
        {COLORS.map((c) => (
          <span
            key={c}
            className={'color-dot' + (color === c ? ' selected' : '')}
            style={{ background: c }}
            onClick={() => setColor(c)}
          />
        ))}
        <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
          <option value={2}>Thin</option>
          <option value={4}>Normal</option>
          <option value={10}>Thick</option>
        </select>
        <button type="button" className="btn ghost" onClick={clear}>Clear</button>
        <div className="spacer" />
        <button
          type="button"
          className="btn primary"
          onClick={() => onAttach(canvasRef.current.toDataURL('image/png'))}
        >
          Attach drawing
        </button>
        <button type="button" className="btn ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default CanvasBoard;

function starPath(cx, cy, r) {
  return `M${cx} ${cy - r} L${cx + r * 0.25} ${cy - r * 0.25} L${cx + r} ${cy} L${cx + r * 0.25} ${cy + r * 0.25} L${cx} ${cy + r} L${cx - r * 0.25} ${cy + r * 0.25} L${cx - r} ${cy} L${cx - r * 0.25} ${cy - r * 0.25}Z`;
}

function Star({ cx, cy, r }) {
  return <path fill="currentColor" stroke="none" d={starPath(cx, cy, r)} />;
}

function sunRays() {
  const rays = [];
  for (let k = 0; k < 8; k += 1) {
    const angle = (k * Math.PI) / 4;
    const x1 = (6.2 * Math.cos(angle)).toFixed(2);
    const y1 = (6.2 * Math.sin(angle)).toFixed(2);
    const x2 = (9.5 * Math.cos(angle)).toFixed(2);
    const y2 = (9.5 * Math.sin(angle)).toFixed(2);
    rays.push(<path key={k} d={`M${x1} ${y1} L${x2} ${y2}`} />);
  }
  return rays;
}

function iconBody(kind) {
  if (kind === "saturn") {
    return (
      <>
        <circle r="5.5" />
        <ellipse rx="11" ry="2.8" transform="rotate(-22)" />
      </>
    );
  }
  if (kind === "moon") {
    return (
      <>
        <path d="M6 -8.5 A9 9 0 1 0 9 4 A7.5 7.5 0 0 1 6 -8.5Z" />
        <Star cx={7.5} cy={-5.5} r={3} />
      </>
    );
  }
  if (kind === "star") {
    return (
      <>
        <path d="M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2Z" />
        <Star cx={8} cy={-8} r={2.6} />
      </>
    );
  }
  if (kind === "comet") {
    return (
      <>
        <circle cx="5" cy="-5" r="3.6" />
        <path d="M2.5 -2.5 L-9 9 M0.8 -5.5 L-10 -1 M5.5 -0.8 L1 10" />
      </>
    );
  }
  if (kind === "rocket") {
    return (
      <g transform="rotate(40)">
        <path d="M0 -10 C5 -5 4 2 3.2 5 L-3.2 5 C-4 2 -5 -5 0 -10Z" />
        <circle cy="-2.5" r="1.7" />
        <path d="M3.2 1.5 L6 5.5 L3.2 5 M-3.2 1.5 L-6 5.5 L-3.2 5 M0 6.5 L0 10" />
      </g>
    );
  }
  if (kind === "sun") {
    return (
      <>
        <circle r="4" />
        {sunRays()}
      </>
    );
  }
  return (
    <>
      <circle r="8" />
      <circle cx="-2.5" cy="-2.5" r="1.5" />
      <circle cx="3" cy="2.5" r="1.1" />
      <circle cx="3.5" cy="-3" r=".8" />
    </>
  );
}

export function DayIcon({ kind }) {
  return (
    <svg viewBox="-12 -12 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconBody(kind)}
    </svg>
  );
}

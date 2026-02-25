import React, { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";

import data from "./data.json";
import { shorten } from "./util";

function get_CPI_values(coicop) {
  const timescale = data.timescales[data.products[coicop].timescale];

  // let deviation = get_deviation_from_base_rate(coicop);
  // deviation.push(0);
  // const step_dev = d => (d > 0) ? 1 : (d === 0) ? 0 : -1;

  let norm = data.products[coicop].CPI[0];
  if (timescale[0] != "2012-01-01") {
    let months_since_2013 =
      (parseInt(timescale[0].split("-")[0]) - 2013) * 12 +
      parseInt(timescale[0].split("-")[1]) -
      6;
    norm = 100 - ((norm - 100) / months_since_2013) * 18;
  }

  // return data.products[coicop].CPI.map((cpi, i) => ({'cpi': cpi/norm*100, 'date': timescale[i], 'deviation': step_dev(deviation[i+1])}));
  return data.products[coicop].CPI.map((cpi, i) => ({
    cpi: (cpi / norm) * 100,
    date: timescale[i],
  }));
}

const MONTHS_FR = [
  "jan.",
  "fevr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "aout",
  "sept.",
  "oct.",
  "nov.",
  "dec.",
];

function format_date_fr_short(dateStr) {
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${MONTHS_FR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function get_closest_point(values, targetDate) {
  const target = targetDate.getTime();
  let best = values[0];
  let bestDist = Math.abs(new Date(best.date).getTime() - target);

  for (let i = 1; i < values.length; i++) {
    const dist = Math.abs(new Date(values[i].date).getTime() - target);
    if (dist < bestDist) {
      best = values[i];
      bestDist = dist;
    }
  }

  return best;
}

// Draws the evolution of CPI over time
function CPITimeline(props) {
  const chartRef = useRef();

  useEffect(() => {
    const values = get_CPI_values(props.coicop);
    const baseline = get_CPI_values("0");
    const valuesWithTooltip = values.map((d) => ({
      ...d,
      title: `${format_date_fr_short(d.date)}: ${d.cpi.toFixed(1)}`,
    }));

    const lastDate = new Date(values[values.length - 1].date);
    const oneYearBefore = new Date(
      Date.UTC(
        lastDate.getUTCFullYear() - 1,
        lastDate.getUTCMonth(),
        lastDate.getUTCDate(),
      ),
    );
    const tenYearsBefore = new Date(
      Date.UTC(
        lastDate.getUTCFullYear() - 10,
        lastDate.getUTCMonth(),
        lastDate.getUTCDate(),
      ),
    );

    const markerOneYear = get_closest_point(values, oneYearBefore);
    const markerTenYears = get_closest_point(values, tenYearsBefore);
    const markers = [
      { ...markerTenYears, label: "10 ans\nplus tôt" },
      { ...markerOneYear, label: "1 an\nplus tôt" },
    ];
    const max_value = Math.max(
      ...values.map((v) => v.cpi),
      ...baseline.map((v) => v.cpi),
    );

    const width = chartRef.current.clientWidth;

    const chart = Plot.plot({
      height: Math.min(width * 0.7, 400),
      width: width,
      style: {
        fontSize: "14px",
      },
      marks: [
        Plot.line(valuesWithTooltip, {
          x: "date",
          y: "cpi",
          title: "title",
          stroke: "steelblue",
          strokeWidth: 2,
          tip: true,
        }),
        Plot.line(baseline, {
          x: "date",
          y: "cpi",
          stroke: "gray",
          strokeWidth: 1,
        }),
        Plot.dot(markers, {
          x: "date",
          y: "cpi",
          fill: "steelblue",
          r: 4,
        }),
        Plot.text(markers, {
          x: "date",
          y: "cpi",
          text: "label",
          dy: -15,
          lineAnchor: "bottom",
          fill: "steelblue",
          fontWeight: "bold",
          textAnchor: "middle",
        }),
      ],
      x: { type: "time", format: "%Y-%m-%d" },
      y: { label: null, grid: true, domain: [0, max_value + 15] },
    });
    chartRef.current.append(chart);
    return () => chart.remove();
  });

  return (
    <>
      <h3>Evolution de l'indice de prix</h3>
      {props.coicop !== "0" && (
        <p>
          <em>
            En bleu: {shorten(data.products[props.coicop].name, 24)} - en gris:
            inflation globale
          </em>
        </p>
      )}
      <div className="chart" ref={chartRef}></div>
    </>
  );
}

/**
 * Draw a bar chart
 * @param {*} props
 * the props must contain the following properties:
 * - data: an array of {x, y} objects
 * - width: the width of the chart (if left unspecified, the width of the parent element is used)
 */
function BarChart(props) {
  const chartRef = useRef();

  useEffect(() => {
    const width = props.width ? props.width : chartRef.current.clientWidth;
    const x = props.x ? props.x : {};
    const y = props.y ? props.y : {};
    const text_format = props.text_format
      ? props.text_format
      : (d) => `${(d.y * 100).toFixed(1)}`;

    const chart = Plot.plot({
      height: Math.min(width * 0.6, 400),
      width: width,
      marginLeft: 50,
      style: {
        fontSize: "14px",
      },
      marks: [
        Plot.barY(props.data, {
          x: "x",
          y: "y",
          fill: "steelblue",
        }),
        Plot.text(props.data, { x: "x", y: "y", text: text_format, dy: -10 }),
      ],
      y: y,
      x: x,
    });
    chartRef.current.append(chart);
    return () => chart.remove();
  });

  return <div className="chart" ref={chartRef}></div>;
}

export { CPITimeline, BarChart };

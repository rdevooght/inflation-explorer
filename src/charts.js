import React, { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import dayjs from "dayjs";

import data from "./data.json";
import {
  shorten,
  signedPercentFormatter,
  monthYearFormatter,
  getDateDuration,
  averageYearlyInflation,
} from "./util";
import { get_closest_index } from "./handleData";

function get_CPI_values(coicop) {
  const timescale = data.timescales[data.products[coicop].timescale];

  // let deviation = get_deviation_from_base_rate(coicop);
  // deviation.push(0);
  // const step_dev = d => (d > 0) ? 1 : (d === 0) ? 0 : -1;

  let norm = data.products[coicop].CPI[0];
  if (timescale[0] !== "2012-01-01") {
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

function get_closest_point(values, targetDate) {
  const target = new Date(targetDate).getTime();
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

    const lastcpi = values[values.length - 1].cpi;
    const lastDate = new Date(values[values.length - 1].date);

    const base_date = dayjs(lastDate);
    const markerOneYear = get_closest_point(
      values,
      base_date.subtract(1, "year").format("YYYY-MM-DD"),
    );
    const markerTenYears = get_closest_point(
      values,
      base_date.subtract(10, "year").format("YYYY-MM-DD"),
    );

    const markers = [
      {
        ...markerTenYears,
        label: `${getDateDuration(markerTenYears.date, lastDate)}\nplus tôt`,
      },
      { ...markerOneYear, label: "1 an\nplus tôt" },
    ];

    const max_value = Math.max(
      ...values.map((v) => v.cpi),
      ...baseline.map((v) => v.cpi),
    );

    const width = chartRef.current.clientWidth;

    function getLegend(d) {
      if (new Date(d.date).getTime() === lastDate.getTime()) {
        return "";
      }

      let legend = `De ${monthYearFormatter(d.date)} à ${monthYearFormatter(lastDate)}
${signedPercentFormatter((lastcpi - d.cpi) / d.cpi)} en ${getDateDuration(d.date, lastDate)} (${signedPercentFormatter(averageYearlyInflation(d.date, lastDate, d.cpi, lastcpi))} par an)`;

      if (props.coicop !== "0") {
        const global_cpi = get_closest_point(baseline, d.date).cpi;
        const last_global_cpi = baseline[baseline.length - 1].cpi;
        legend += `\nInflation globale: ${signedPercentFormatter((last_global_cpi - global_cpi) / global_cpi)} (${signedPercentFormatter(averageYearlyInflation(d.date, lastDate, global_cpi, last_global_cpi))} par an) sur cette période`;
      }

      return legend;
    }

    const chart = Plot.plot({
      height: Math.min(width * 0.7, 400),
      width: width,
      style: {
        fontSize: "14px",
      },
      marks: [
        Plot.line(values, {
          x: "date",
          y: "cpi",
          stroke: "steelblue",
          strokeWidth: 2,
          tip: false,
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
        Plot.ruleX(
          values,
          Plot.pointerX({ x: "date", py: "cpi", stroke: "black" }),
        ),
        Plot.dot(
          values,
          Plot.pointerX({ x: "date", y: "cpi", stroke: "black" }),
        ),
        Plot.text(
          values,
          Plot.pointerX({
            px: "date",
            py: "cpi",
            dy: -20,
            dx: 10,
            frameAnchor: "bottom-left",
            fontVariant: "tabular-nums",
            text: (d) => getLegend(d),
          }),
        ),
        Plot.text(
          values,
          Plot.pointerX({
            x: "date",
            y: "cpi",
            dy: 10,
            dx: 10,
            text: (d) => `${monthYearFormatter(d.date)}\n${d.cpi.toFixed(1)}`,
            textAnchor: "start",
            lineAnchor: "top",
          }),
        ),
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
    x.padding = 0.3;
    const text_format = props.text_format
      ? props.text_format
      : (d) => `${(d.y * 100).toFixed(1)}`;
    const marks = [
      Plot.barY(props.data, {
        x: "x",
        y: "y",
        fill: "steelblue",
      }),
    ];

    if (props.reference_y !== undefined) {
      marks.push(
        Plot.ruleY([props.reference_y], {
          stroke: "black",
          strokeDasharray: "4,4",
          strokeWidth: 2,
        }),
      );
    }

    marks.push(
      Plot.text(props.data, {
        x: "x",
        y: "y",
        text: text_format,
        dy: -10,
        fill: "black",
        stroke: "white", // halo color
        strokeWidth: 5, // halo thickness
        strokeLinejoin: "round",
        paintOrder: "stroke",
      }),
    );

    const chart = Plot.plot({
      height: Math.min(width * 0.6, 400),
      width: width,
      marginLeft: 50,
      style: {
        fontSize: "14px",
      },
      marks: marks,
      y: y,
      x: x,
    });
    chartRef.current.append(chart);
    return () => chart.remove();
  });

  return <div className="chart" ref={chartRef}></div>;
}

/**
 * Draw a line chart
 * @param {*} props
 * the props must contain the following properties:
 * - data: an array of {x, y} objects
 * - width: the width of the chart (if left unspecified, the width of the parent element is used)
 */
function LineChart(props) {
  const chartRef = useRef();

  useEffect(() => {
    const width = props.width ? props.width : chartRef.current.clientWidth;
    const x = props.x ? props.x : {};
    const y = props.y ? props.y : {};
    const text_format = props.text_format
      ? props.text_format
      : (d) => `${(d.y * 100).toFixed(1)}`;
    const hasSeries = props.series !== undefined;
    const highlightedSeries = props.highlightedSeries;
    const marks = [];

    if (hasSeries) {
      const availableSeries = Object.keys(props.series).filter((seriesKey) =>
        props.data.some((d) => d.series === seriesKey),
      );
      const mutedSeries = availableSeries.filter(
        (seriesKey) => seriesKey !== highlightedSeries,
      );

      mutedSeries.forEach((seriesKey) => {
        const seriesData = props.data.filter((d) => d.series === seriesKey);
        marks.push(
          Plot.line(seriesData, {
            x: "x",
            y: "y",
            stroke: props.series[seriesKey].color,
            strokeOpacity: 0.2,
            marker: true,
            markerFillOpacity: 0.2,
            markerStrokeOpacity: 0.2,
            strokeWidth: 1.4,
            tip: false,
          }),
        );
      });

      const highlightedData = props.data.filter(
        (d) => d.series === highlightedSeries,
      );
      if (highlightedData.length > 0) {
        marks.push(
          Plot.line(highlightedData, {
            x: "x",
            y: "y",
            stroke: props.series[highlightedSeries].color,
            strokeWidth: 2,
            marker: true,
            tip: false,
            title: text_format,
          }),
        );
        marks.push(
          Plot.text(highlightedData, {
            x: "x",
            y: "y",
            text: text_format,
            dy: -15,
            fill: props.series[highlightedSeries].color,
            fontWeight: "bold",
            stroke: "white", // halo color
            strokeWidth: 5, // halo thickness
            strokeLinejoin: "round",
            paintOrder: "stroke",
          }),
        );
      }
    } else {
      marks.push(
        Plot.line(props.data, {
          x: "x",
          y: "y",
          stroke: "steelblue",
          strokeWidth: 2,
          marker: true,
          tip: false,
        }),
      );
      marks.push(
        Plot.text(props.data, {
          x: "x",
          y: "y",
          text: text_format,
          dy: -10,
        }),
      );
    }

    const chart = Plot.plot({
      height: Math.min(width * 0.6, 400),
      width: width,
      marginLeft: 50,
      style: {
        fontSize: "14px",
      },
      marks: marks,
      y: y,
      x: x,
    });
    chartRef.current.append(chart);
    return () => chart.remove();
  });

  return <div className="chart" ref={chartRef}></div>;
}

export { CPITimeline, BarChart, LineChart };

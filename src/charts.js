
import React, {useEffect, useRef} from 'react';
import * as Plot from "@observablehq/plot";

import data from './data.json';
import {shorten} from './util';
import { get_deviation_from_base_rate } from './handleData';

function get_CPI_values(coicop) {
  const timescale = data.timescales[data.products[coicop].timescale];

  // let deviation = get_deviation_from_base_rate(coicop);
  // deviation.push(0);
  // const step_dev = d => (d > 0) ? 1 : (d === 0) ? 0 : -1;

  let norm = data.products[coicop].CPI[0];
  if (timescale[0] != '2012-01-01') {
    let months_since_2013 = (parseInt(timescale[0].split('-')[0]) - 2013) * 12 + parseInt(timescale[0].split('-')[1]) - 6;
    norm = 100 - (norm - 100) / months_since_2013 * 18;
  }

  // return data.products[coicop].CPI.map((cpi, i) => ({'cpi': cpi/norm*100, 'date': timescale[i], 'deviation': step_dev(deviation[i+1])}));
  return data.products[coicop].CPI.map((cpi, i) => ({'cpi': cpi/norm*100, 'date': timescale[i]}));
}

// Draws the evolution of CPI over time
function CPITimeline(props) {

    const chartRef = useRef();
  
    useEffect(() => {
      const values = get_CPI_values(props.coicop);
      const baseline = get_CPI_values('0');
      const max_value = Math.max(...values.map(v => v.cpi), ...baseline.map(v => v.cpi));
      
      const width = chartRef.current.clientWidth;

      const chart = Plot.plot({
        height: Math.min(width*0.7, 400),
        width: width,
        style: {
          fontSize: '14px',
        },
        marks: [
          Plot.line(values, {
            x: "date", 
            y: "cpi",
            // z: null,
            // stroke: "deviation",
            stroke: "steelblue",
            strokeWidth: 2,
          }),
          Plot.line(baseline, {
            x: "date", 
            y: "cpi",
            // z: null,
            // stroke: "deviation",
            stroke: "gray",
            strokeWidth: 1,
          })
        ],
        /*color: {
          type: "categorical",
          domain: [-1, 0, 1],
          range: ["#00ff00", "#0000ff", "#ff0000"], 
          legend: false,
        },*/
        x: {type: "time", format: "%Y-%m-%d", domain: ['2011-06-01', '2022-05-31']},
        y: {label: null, grid: true, domain: [0, max_value]},
      });
      chartRef.current.append(chart);
      return () => chart.remove();
    });
  
    return (
      <>
        <h3>Evolution de l'indice de prix</h3>
        {props.coicop !== '0' && <p><em>En bleu: {shorten(data.products[props.coicop].name, 24)} - en gris: inflation globale</em></p>}
        <div className='chart' ref={chartRef}>
        </div>
      </>
    )
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
      const text_format = props.text_format ? props.text_format : d => `${(d.y * 100).toFixed(1)}`;

      const chart = Plot.plot({
        height: Math.min(width*0.6, 400),
        width: width,
        marginLeft: 50,
        style: {
          fontSize: '14px',
        },
        marks: [
          Plot.barY(props.data, {
            x: "x", 
            y: "y",
            fill: "steelblue",
          }),
          Plot.text(props.data, {x: "x", y: "y", text: text_format, dy: -10}),
        ],
        y: y,
        x: x,
      });
      chartRef.current.append(chart);
      return () => chart.remove();
    });
  
    return (
      <div className='chart' ref={chartRef}>
      </div>
    )
  }

  export {CPITimeline, BarChart};
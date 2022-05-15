
import React, {useEffect, useRef} from 'react';
import * as Plot from "@observablehq/plot";

import data from './data.json';

// Draws the evolution of CPI over time
function CPITimeline(props) {

    const chartRef = useRef();
  
    useEffect(() => {
      const timescale = data.timescales[data.products[props.coicop].timescale];
      const values = data.products[props.coicop].CPI.map((cpi, i) => ({'cpi': cpi, 'date': timescale[i]}));
      
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
            stroke: "steelblue",
            strokeWidth: 2,
          })
        ],
        x: {type: "time", format: "%Y-%m-%d", domain: ['2011-06-01', '2022-05-31']},
        y: {label: null, grid: true},
      });
      chartRef.current.append(chart);
      return () => chart.remove();
    });
  
    return (
      <div className='chart' ref={chartRef}>
      </div>
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
          })
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
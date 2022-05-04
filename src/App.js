import './App.css';
import React, {useEffect, useRef, useState} from 'react';
import data from './data.json';
import {search, get_children} from './search';
import {shorten} from './util';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import { InputGroup, FormControl, Button } from 'react-bootstrap';
import * as Plot from "@observablehq/plot";

function SearchInput(props) {
  return (
    <Form className='mb-2'>
      <Form.Group>
        <InputGroup>
          <FormControl 
            value={props.query} 
            onChange={props.onChange}
            placeholder='Rechercher une catégorie de produits'
          />
          <Button variant="outline-secondary" onClick={() => props.onChange({target:{value:''}})}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
          </Button>
        </InputGroup>
      </Form.Group>
    </Form>
  )
}

function BreadCrumb(props) {

  // In case this is the top category, no breadcrumb is needed
  if (props.coicop === '0') {
    return (<div className='breadcrumb'></div>);
  }
  
  const current = data.products[props.coicop];
  var breadcrumb = [];
  for (var i = props.coicop.length-1; i > 1; i--) {
    breadcrumb.push(data.products[props.coicop.slice(0, i)]);
  }
  breadcrumb.push(data.products["0"]);

  const parent = breadcrumb[0];
  return (
    <div className='breadcrumb'>
      Hierarchie:
      {(breadcrumb.length > 1) && " ... ›"}
      &nbsp;
      <a 
        href={`#${parent.coicop}`} 
        onClick={() => props.setCOICOP(parent.coicop)}
        title={parent.name}
      >{shorten(parent.name, 24)}</a>
      &nbsp; &rsaquo;
    </div>
  )
}

function CPITimeline(props) {

  const chartRef = useRef();

  useEffect(() => {
    const timescale = data.timescales[data.products[props.coicop].timescale];
    const values = data.products[props.coicop].CPI.map((cpi, i) => ({'cpi': cpi, 'date': timescale[i]}));
    
    const width = chartRef.current.previousSibling.clientWidth;
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
      x: {type: "time", format: "%Y-%m-%d"},
      y: {label: null, grid: true},
    });
    chartRef.current.append(chart);
    return () => chart.remove();
  });

  return (
    <div className='CPITimeline' ref={chartRef}>
    </div>
  )
}

function SubProducts(props) {

  // children contains an array of COICOP codes
  const children = get_children(props.coicop);

  if (children.length === 0) {
    return null;
  }

  return (
    <div>
      <Card.Subtitle className='mt-1'>Sous-catégories</Card.Subtitle>
      <ul variant='flush'>
        {children.map(child => (
          <li key={child}>
            <a onClick={() => props.setCOICOP(child)} href={`#${child}`}>{data.products[child].name}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SearchResult(props) {
  const [opened, setOpened] = useState(false);

  if (props.opened && !opened) {
    setOpened(true);
  }

  function open() {
    if (!opened) {
      setOpened(true);
    }
  }

  function close() {
    if (opened) {
      setOpened(false);
    }
  }

  const cat = data.products[props.result.coicop];

  let className = 'mb-2';
  if (opened) {
    className += ' opened';
  } else {
    className += ' closed';
  }

  return (
    <Card className={className}>
      <Card.Body onClick={open}>
        {opened && <BreadCrumb coicop={props.result.coicop} setCOICOP={props.setCOICOP} />}
        <Card.Title>{cat.name}</Card.Title>
        {opened && <CPITimeline coicop={props.result.coicop}/>}
        {opened && <SubProducts coicop={props.result.coicop} setCOICOP={props.setCOICOP} />}
      </Card.Body>
    </Card>
  )
}

function SearchResults(props) {
  return (
    <div className='searchResults'>
      <span className='text-muted'>
        {props.results.length} résultats parmi {Object.keys(data.products).length} catégories
      </span>
      {props.results.map((result, i) => (
        <SearchResult key={result.coicop} result={result} setCOICOP={props.setCOICOP} opened={i == 0} count={i} />
      ))}
    </div>
  )
}

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {query: 'Boissons', queryType: 'text'};
    this.onInputChange = this.onInputChange.bind(this);
    this.setCOICOP = this.setCOICOP.bind(this);
  }

  setCOICOP(coicop) {
    this.setState({query: coicop, queryType: 'coicop'});
  }

  onInputChange(event) {
    this.setState({query: event.target.value, queryType: 'text'});
  }

  render () {

    let results = [];
    if (this.state.query) {
      if (this.state.queryType === 'text') {
        results = search(this.state.query);
      } else {
        results = [data.products[this.state.query]];
      }
    }

    const input = (this.state.queryType === 'text') ? this.state.query : data.products[this.state.query].name;

    return (
      <div id="searchApp" className='p-3'>
        <SearchInput query={input} onChange={this.onInputChange}/>
        <SearchResults results={results} setCOICOP={this.setCOICOP} />
      </div>
    );
  }
}

export default App;

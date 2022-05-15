import './App.css';
import React, {useEffect, useState} from 'react';

import { InputGroup, FormControl, Button } from 'react-bootstrap';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';

import data from './data.json';
import {search, get_children} from './search';
import {shorten} from './util';
import { get_closest_index } from './handleData';
import { CPITimeline, BarChart } from './charts';

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
    return (<div></div>);
  }
  
  var breadcrumb = [];
  for (var i = props.coicop.length-1; i > 1; i--) {
    breadcrumb.push(data.products[props.coicop.slice(0, i)]);
  }
  breadcrumb.push(data.products["0"]);

  const parent = breadcrumb[0];
  return (
    <div>
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



// Shows the evolution of EBM data for a given COICOP code
function EBMSummary(props) {

  let absolute_consumption = [];
  let relative_consumption = [];
  let normaliser = 0;

  for (let year of [2012, 2014, 2016, 2018, 2020]) {
    if (props.coicop in data.spendings[year]) {

      const cpi = get_closest_index(props.coicop, `${year}-06`);
      absolute_consumption.push({x: year, y: data.spendings[year][props.coicop]['abs']/cpi});
      if (normaliser === 0) {
        normaliser = absolute_consumption[absolute_consumption.length-1].y;
      }
      absolute_consumption[absolute_consumption.length-1].y /= normaliser;

      relative_consumption.push({x: year, y: data.spendings[year][props.coicop]['rel']});
    }
  }

  return (
    <div className='EBMSummary row row-cols-1 row-cols-sm-2'>
      <div className='col'>
        <h4>Evolution de la consommation réelle</h4>
        <BarChart data={absolute_consumption} x={{label: null}} y={{label: null, grid: true, percent: true}} />
      </div>
      <div className='col'>
        <h4>Part dans le budget annuel</h4>
        <BarChart data={relative_consumption} x={{label: null}} y={{label: null, grid: true, tickFormat: "p"}} />
      </div>
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

  if (opened) {
    return (
      <Card className='opened mb-2'>
        <Card.Header><BreadCrumb coicop={props.result.coicop} setCOICOP={props.setCOICOP} /></Card.Header>
        <Card.Body>
          <h2>{cat.name}</h2>
          <CPITimeline coicop={props.result.coicop}/>
          <EBMSummary coicop={props.result.coicop} />
          <SubProducts coicop={props.result.coicop} setCOICOP={props.setCOICOP} />
        </Card.Body>
      </Card>
    )
  } else {
    return (
      <Card className='closed mb-2'>
        <Card.Body onClick={props.open}>
          <h3 className='mb-0'>{cat.name}</h3>
        </Card.Body>
      </Card>
    )
  }
}

function SearchResults(props) {

  // The opened_results state contains the IDs of the results that are currently opened
  const [opened_results, set_opened_results] = useState([0]);

  const first_result = props.results.length ? props.results[0].coicop : null;

  useEffect(() => {
    set_opened_results([0]);
  }, [first_result]);

  const open_result = (id) => {
    if (opened_results.indexOf(id) === -1) {
      set_opened_results([...opened_results, id]);
    }
  }

  return (
    <div className='searchResults'>
      <span className='text-muted'>
        {props.results.length} résultats parmi {Object.keys(data.products).length} catégories
      </span>
      {props.results.map((result, i) => (
        <SearchResult 
          key={result.coicop} 
          result={result} 
          setCOICOP={props.setCOICOP} 
          opened={opened_results.includes(i)} 
          open={() => open_result(i)}
          count={i} />
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

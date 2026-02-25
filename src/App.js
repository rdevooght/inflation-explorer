import "./App.css";
import React, { useEffect, useState } from "react";

import { InputGroup, FormControl, Button } from "react-bootstrap";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import Badge from "react-bootstrap/Badge";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Stack from "react-bootstrap/Stack";

import dayjs from "dayjs";
import "dayjs/locale/fr";

import data from "./data.json";
import { search, exact_match } from "./search";
import { shorten } from "./util";
import {
  get_closest_index,
  get_spendings,
  groupings_options,
  get_children,
  get_max_relative_spending,
  get_facets,
  get_facet_elements,
} from "./handleData";
import { CPITimeline, BarChart } from "./charts";

const YEARS = [2014, 2016, 2018, 2020, 2022, 2024];

function SearchExamples(props) {
  const examples = ["Loyer", "Pain", "Essence", "Bière", "Assurance voyage"];

  return (
    <Stack
      direction="horizontal"
      gap={2}
      className="mt-2 mb-3 py-1 search-examples"
    >
      <span>Exemples :</span>
      {examples.map((example) => (
        <Button
          variant="outline-dark"
          className="rounded-pill"
          key={example}
          onClick={() => props.onChange({ target: { value: example } })}
        >
          {example}
        </Button>
      ))}
    </Stack>
  );
}

function SearchInput(props) {
  const products = Object.keys(data.products)
    .map((key) => data.products[key])
    .sort((a, b) => (a.coicop > b.coicop ? 1 : -1));

  return (
    <Form
      className="mb-2"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <Form.Group>
        <InputGroup>
          <FormControl
            list="product-list"
            value={props.query}
            onChange={props.onChange}
            placeholder="Rechercher une catégorie de produits"
          />
          <Button
            variant="outline-secondary"
            onClick={() => props.onChange({ target: { value: "" } })}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
            </svg>
          </Button>
        </InputGroup>
      </Form.Group>
      <datalist id="product-list">
        {products.map((product) => (
          <option
            key={product.coicop}
            value={`${"-".repeat(product.level)} ${product.name}`}
          />
        ))}
      </datalist>
      <SearchExamples onChange={props.onChange} />
    </Form>
  );
}

function BreadCrumb(props) {
  // In case this is the top category, no breadcrumb is needed
  if (props.coicop === "0") {
    return <div></div>;
  }

  var breadcrumb = [];
  for (var i = props.coicop.length - 1; i > 1; i--) {
    breadcrumb.push(data.products[props.coicop.slice(0, i)]);
  }
  breadcrumb.push(data.products["0"]);

  const parent = breadcrumb[0];
  /*return (
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
  )*/

  return (
    <div>
      {breadcrumb.reverse().map((d) => (
        <span key={d.coicop}>
          <a
            href={`#${d.coicop}`}
            onClick={() => props.setCOICOP(d.coicop)}
            title={d.name}
          >
            {shorten(d.name, 24)}
          </a>
          &nbsp; &rsaquo; &nbsp;
        </span>
      ))}
    </div>
  );
}

function YearSelector(props) {
  const years = YEARS;

  return (
    <div className="d-flex flex-wrap gap-1 gap-sm-2 align-items-center justify-content-center flex-fill">
      {years.map((year) => (
        <Button
          key={year}
          variant={props.value === year ? "dark" : "outline-dark"}
          className="rounded-pill btn-sm"
          onClick={() => props.onChange(year)}
        >
          {year}
        </Button>
      ))}
    </div>
  );
}

function FacetSelector(props) {
  const facets = get_facets();

  return (
    <FloatingLabel label="Comparer par">
      <Form.Select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      >
        {facets.map((facet) => (
          <option key={facet} value={facet}>
            {facet}
          </option>
        ))}
      </Form.Select>
    </FloatingLabel>
  );
}

// Shows the EBM data for a given COICOP code
// Allow to compare group or regions for a given year
function EBMComparison(props) {
  let [facet, setFacet] = useState("quartile de revenus");
  let [year, setYear] = useState(YEARS[YEARS.length - 1]);

  if (props.coicop.startsWith("10")) {
    return <></>;
  }

  let absolute_consumption = [];
  let relative_consumption = [];

  for (let elem of get_facet_elements(facet)) {
    let spendings = get_spendings(
      props.coicop,
      year,
      elem.region,
      elem.grouping,
      elem.group,
    );
    if (spendings !== undefined) {
      absolute_consumption.push({ x: elem.label, y: spendings[0] });

      relative_consumption.push({ x: elem.label, y: spendings[1] });
    }
  }

  const consommation_par_menage_helper = (
    <Popover id="popover-basic">
      <Popover.Body>
        Dépenses annuelles moyennes par ménage en euros.
      </Popover.Body>
    </Popover>
  );

  const eurostat_legend = [
    ["Personne seule", "Seul·e"],
    ["2 adultes", "2 A"],
    ["3 adultes ou plus", "3+ A"],
    ["1 adulte avec enfant(s) dépendant(s)", "1 A + E"],
    ["2 adultes avec  enfant(s) dépendant(s)", "2 A + E"],
    ["3 adultes ou plus avec enfant(s) dépendant(s)", "3+ A + E"],
  ];

  return (
    <div className="my-5">
      <h3>Comparaison de groupes</h3>
      <Row className="my-4 my-sm-2 row-cols-1 row-cols-sm-2 gap-3 gap-sm-0">
        <Col>
          <FacetSelector value={facet} onChange={setFacet} />
        </Col>
        <Col className="d-flex align-items-center">
          <YearSelector value={year} onChange={setYear} />
        </Col>
      </Row>
      <div className="row row-cols-1 row-cols-sm-2">
        <div className="col">
          <h4 className="d-flex justify-content-between align-items-start">
            Part dans le budget annuel
          </h4>
          <BarChart
            data={relative_consumption}
            x={{ label: null }}
            y={{ label: null, grid: true, tickFormat: "p" }}
          />
        </div>
        <div className="col">
          <h4 className="d-flex justify-content-between align-items-start">
            Dépenses par ménage en euros
            <OverlayTrigger
              trigger={["hover", "focus"]}
              placement="auto"
              overlay={consommation_par_menage_helper}
            >
              <span className="small fs-6 ml-2">
                <Badge pill bg="secondary">
                  ?
                </Badge>
              </span>
            </OverlayTrigger>
          </h4>
          <BarChart
            data={absolute_consumption}
            x={{ label: null }}
            y={{ label: null, grid: true }}
            text_format={(d) => `${d.y} €`}
          />
        </div>
      </div>
      {facet === "type de ménage eurostat" && (
        <div className="mt-2">
          <p className="mb-0">Légende:</p>
          <ul>
            {eurostat_legend.map(([label, code]) => (
              <li key={code}>
                {code}: {label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RegionSelector(props) {
  const regions = {
    BE: "Belgique",
    BXL: "Bruxelles",
    FL: "Flandre",
    WAL: "Wallonie",
  };

  return (
    <div className="d-flex flex-wrap gap-1 gap-sm-2 align-items-center justify-content-center flex-fill">
      {Object.keys(regions).map((region) => (
        <Button
          key={region}
          variant={props.value === region ? "dark" : "outline-dark"}
          className="rounded-pill btn-sm"
          onClick={() => props.onChange(region)}
        >
          {regions[region]}
        </Button>
      ))}
    </div>
  );
}

function GroupSelector(props) {
  return (
    <FloatingLabel label="Groupe">
      <Form.Select
        value={props.value[0] + "_" + props.value[1]}
        onChange={(e) => props.onChange(e.target.value.split("_"))}
      >
        {Object.keys(groupings_options).map((grouping) => (
          <optgroup key={grouping} label={grouping}>
            {groupings_options[grouping].map((group) => (
              <option
                key={grouping + "_" + group}
                value={grouping + "_" + group}
              >
                {group === "total" ? "Toute la population" : group}
              </option>
            ))}
          </optgroup>
        ))}
      </Form.Select>
    </FloatingLabel>
  );
}

// Shows the evolution of EBM data for a given COICOP code
function EBMSummary(props) {
  let [group, setGroup] = useState(["total", "total"]);
  let [region, setRegion] = useState("BE");

  if (props.coicop.startsWith("10")) {
    return (
      <div className="my-5">
        <h3>Evolution de la consommation</h3>
        <p>
          Les données concernant l'enseignement sont définies différemment dans
          l'enquête sur le budget des ménages et dans l'indice des prix à la
          consommation, il n'est donc pas possible de visualiser les données
          relative au budget pour l'enseignement.
        </p>
      </div>
    );
  }

  let absolute_consumption = [];
  let relative_consumption = [];
  let normaliser = 0;
  let max_consumption = 0;

  const max_relative_spending = get_max_relative_spending(props.coicop);

  // Find normaliser: consumption for the whole population at the earliest available year
  for (let year of YEARS) {
    let base_spendings = get_spendings(
      props.coicop,
      year,
      "BE",
      "total",
      "total",
    );
    if (base_spendings !== undefined) {
      const cpi = get_closest_index(props.coicop, `${year}-06`);
      normaliser = base_spendings[0] / cpi;
      break;
    }
  }

  for (let year of YEARS) {
    let spendings = get_spendings(
      props.coicop,
      year,
      region,
      group[0],
      group[1],
    );
    if (spendings !== undefined) {
      const cpi = get_closest_index(props.coicop, `${year}-06`);

      absolute_consumption.push({
        x: year,
        y: spendings[0] / cpi / normaliser,
      });

      max_consumption = Math.max(
        max_consumption,
        spendings[0] / cpi / normaliser,
      );

      relative_consumption.push({ x: year, y: spendings[1] });
    }
  }

  // Ensures that the scale of the graph of real consumption goes at least to 100
  const abs_y =
    max_consumption < 1
      ? { label: null, grid: true, percent: true, domain: [0, 100] }
      : { label: null, grid: true, percent: true };

  const part_budget_helper = (
    <Popover id="popover-basic">
      <Popover.Body>
        <p>
          Part que les d&eacute;penses pour ce produit repr&eacute;sentent les
          d&eacute;penses annuelles de la population (ou du sous-groupe de la
          population s&eacute;lectionn&eacute;).
        </p>
        <p>
          Les donn&eacute;es viennent de l&rsquo; enqu&ecirc;te sur le budget
          des m&eacute;nages. Malheureusement, la d&eacute;finition des
          cat&eacute;gories n&rsquo;est parfois pas exactement la m&ecirc;me que
          pour l&rsquo;indice des prix, mais les diff&eacute;rences concernent
          en g&eacute;n&eacute;ral des d&eacute;tails qui ne devraient pas
          affecter l&rsquo;interpr&eacute;tation des chiffres.
        </p>
      </Popover.Body>
    </Popover>
  );

  const consommation_reelle_helper = (
    <Popover id="popover-basic">
      <Popover.Body>
        <p>
          La consommation "réelle" est calculée en tenant compte des montants
          moyens dépensés par les ménages, et de l'évolution de l'indice de prix
          pour ce produit. Si les montants dépensés pour un produit évolue au
          même rythme que l'indice des prix, la consommation réelle apparaitra
          stable.
        </p>
        <p>
          Par exemple, si le prix du pain augmente de 10%, et que les dépenses
          en pain augmentent aussi de 10%, le nombre de pains achetés n'a pas
          changé, la consommation réelle est donc stable. Si les montants
          dépensés augmentent plus vite que l'indice des prix, on considère que
          la consommation réelle a augmenté, et à l'inverse qu'elle a diminué si
          les montants augmentent moins vite que les prix.
        </p>
        <p>
          La consommation moyenne de l'ensemble de la population en 2012 est
          fixée à 100. La consommation pour les autres années et pour les
          sous-groupes de population sont calculés relativement à cette valeur.
        </p>
      </Popover.Body>
    </Popover>
  );

  return (
    <div className="my-5">
      <h3>Evolution de la consommation</h3>
      <Row className="my-4 my-sm-2 row-cols-1 row-cols-sm-2 gap-3 gap-sm-0">
        <Col>
          <GroupSelector value={group} onChange={setGroup} />
        </Col>
        <Col className="d-flex align-items-center">
          <RegionSelector value={region} onChange={setRegion} />
        </Col>
      </Row>
      <div className="row row-cols-1 row-cols-sm-2">
        <div className="col">
          <h4 className="d-flex justify-content-between align-items-start">
            Part dans le budget annuel
            <OverlayTrigger
              trigger={["hover", "focus"]}
              placement="auto"
              overlay={part_budget_helper}
            >
              <span className="small fs-6 ml-2">
                <Badge pill bg="secondary">
                  ?
                </Badge>
              </span>
            </OverlayTrigger>
          </h4>
          <BarChart
            data={relative_consumption}
            x={{ label: null }}
            y={{
              label: null,
              grid: true,
              tickFormat: "p",
              domain: [0, max_relative_spending],
            }}
          />
        </div>
        <div className="col">
          <h4 className="d-flex justify-content-between align-items-start">
            Evolution de la consommation réelle
            <OverlayTrigger
              trigger={["hover", "focus"]}
              placement="auto"
              overlay={consommation_reelle_helper}
            >
              <span className="small fs-6 ml-2">
                <Badge pill bg="secondary">
                  ?
                </Badge>
              </span>
            </OverlayTrigger>
          </h4>
          <BarChart data={absolute_consumption} x={{ label: null }} y={abs_y} />
        </div>
      </div>
    </div>
  );
}

function SubProducts(props) {
  // children contains an array of COICOP codes
  const children = get_children(props.coicop);

  if (children.length === 0) {
    return null;
  }

  return (
    <div>
      <Card.Subtitle className="mt-1">Sous-catégories</Card.Subtitle>
      <ul variant="flush">
        {children.map((child) => (
          <li key={child}>
            <a onClick={() => props.setCOICOP(child)} href={`#${child}`}>
              {data.products[child].name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CPITextSummary(props) {
  const today = dayjs();
  const [most_recent_CPI, most_recent_date] = get_closest_index(
    props.coicop,
    today.format("YYYY-MM"),
    true,
  );
  const base_date = dayjs(most_recent_date);
  const [previous_year_CPI, previous_year_date] = get_closest_index(
    props.coicop,
    base_date.subtract(1, "year").format("YYYY-MM"),
    true,
  );
  const [previous_decade_CPI, previous_decade_date] = get_closest_index(
    props.coicop,
    base_date.subtract(10, "year").format("YYYY-MM"),
    true,
  );

  const year_ev = (most_recent_CPI - previous_year_CPI) / previous_year_CPI;
  const decade_ev =
    (most_recent_CPI - previous_decade_CPI) / previous_decade_CPI;

  function evolution_text(ev) {
    if (ev === 0) {
      return <>identique à</>;
    } else if (ev > 0) {
      return (
        <>
          <Badge pill bg="danger">
            {Math.abs(ev * 100).toFixed(1)}%
          </Badge>{" "}
          plus élevé que
        </>
      );
    } else {
      return (
        <>
          <Badge pill bg="success">
            {Math.abs(ev * 100).toFixed(1)}%
          </Badge>{" "}
          moins élevé que
        </>
      );
    }
  }

  return (
    <p className="my-3">
      En {base_date.locale("fr").format("MMMM YYYY")}, le prix du produit est{" "}
      {evolution_text(year_ev)} an plus tôt, et {evolution_text(decade_ev)}{" "}
      {base_date.year() - dayjs(previous_decade_date).year()} ans plus tôt.
    </p>
  );
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
      <Card className="opened mb-2">
        <Card.Header>
          <BreadCrumb
            coicop={props.result.coicop}
            setCOICOP={props.setCOICOP}
          />
        </Card.Header>
        <Card.Body>
          <h2>{cat.name}</h2>
          <CPITimeline coicop={props.result.coicop} />
          <CPITextSummary coicop={props.result.coicop} />
          {props.result.coicop !== "0" && (
            <EBMSummary coicop={props.result.coicop} />
          )}
          {props.result.coicop !== "0" && (
            <EBMComparison coicop={props.result.coicop} />
          )}
          <SubProducts
            coicop={props.result.coicop}
            setCOICOP={props.setCOICOP}
          />
        </Card.Body>
      </Card>
    );
  } else {
    return (
      <Card className="closed mb-2">
        <Card.Body onClick={props.open}>
          <h3 className="mb-0">{cat.name}</h3>
        </Card.Body>
      </Card>
    );
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
  };

  return (
    <div className="searchResults">
      <span className="text-muted">
        {props.results.length} résultats parmi{" "}
        {Object.keys(data.products).length} catégories
      </span>
      {props.results.map((result, i) => (
        <SearchResult
          key={result.coicop}
          result={result}
          setCOICOP={props.setCOICOP}
          opened={opened_results.includes(i)}
          open={() => open_result(i)}
          count={i}
        />
      ))}
    </div>
  );
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { query: "", queryType: "text" };
    this.onInputChange = this.onInputChange.bind(this);
    this.setCOICOP = this.setCOICOP.bind(this);
  }

  componentDidMount() {
    if (window.location.hash) {
      const hash = decodeURI(window.location.hash.slice(1));
      if (/^\d+$/.test(hash)) {
        this.setCOICOP(hash);
      } else {
        this.setState({ query: hash, queryType: "text" });
      }
    }
  }

  setCOICOP(coicop) {
    this.setState({ query: coicop, queryType: "coicop" });
  }

  onInputChange(event) {
    let query = event.target.value;
    if (query.startsWith("-")) {
      query = query.replace(/^-+ /, "");
      let match = exact_match(query);
      if (match) {
        this.setCOICOP(match);
        window.location.hash = `#${match}`;
        return;
      }
    }

    this.setState({ query: event.target.value, queryType: "text" });
    window.location.hash = `#${event.target.value}`;
  }

  render() {
    let results = [data.products["0"]];
    if (this.state.query) {
      if (this.state.queryType === "text") {
        results = search(this.state.query);
      } else {
        results = [data.products[this.state.query]];
      }
    }

    const input =
      this.state.queryType === "text"
        ? this.state.query
        : data.products[this.state.query].name;

    return (
      <div id="searchApp" className="py-3 px-1 px-sm-0">
        <SearchInput query={input} onChange={this.onInputChange} />
        <SearchResults results={results} setCOICOP={this.setCOICOP} />
      </div>
    );
  }
}

export default App;

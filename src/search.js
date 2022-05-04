import data from './data.json';
import Fuse from 'fuse.js';


function remove_final_s(str) {
  if (str[str.length-1] === 's') {
    return str.slice(0, -1);
  }
  return str;
}

function make_search_engine() {
  
  const options = {
    keys: ['name'],
    includeScore: true,
    minMatchCharLength: 3,
    threshold: 0.3,
  };

  const search_items = Object.keys(data.products).map(coicop => ({
    coicop: coicop,
    name: data.products[coicop].name,
  }));
  const fuse = new Fuse(search_items, options);

  function search(query) {
    const results = fuse.search(query);
    const products = results.map(r => Object.assign({score: r.score}, {coicop: r.item.coicop}));
    // products.sort((a, b) => b.score - a.score);
    return products;
  }

  return search;
}

const search = make_search_engine();

function get_children(coicop) {
  var children = Object.keys(data.products).filter(
    c => c.slice(0, -1) === coicop
  );
  return children;
}

export {search, get_children};
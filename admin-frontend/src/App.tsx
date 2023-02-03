import React from "react";
import "./App.css";
import Products from "./admin/Products";
import { BrowserRouter, Route } from "react-router-dom";
import ProductsCreate from "./admin/ProductsCreate";
import ProductsEdit from "./admin/ProductsEdit";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Route path="/" exact component={Products} />
        <Route path="/products/create" exact component={ProductsCreate} />
        <Route path="/products/:id/edit" exact component={ProductsEdit} />
      </BrowserRouter>
    </div>
  );
}

export default App;

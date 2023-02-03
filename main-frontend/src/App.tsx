import React from "react";
import "./App.css";
import { BrowserRouter, Route } from "react-router-dom";
import Main from "./main/Main";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Route path="/" exact component={Main} />
      </BrowserRouter>
    </div>
  );
}

export default App;

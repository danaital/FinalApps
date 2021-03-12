import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom'
import './index.css';
import App from './App';
import Login from './components/Login';
import Category from './components/Category';
import Registration from "./components/Registration";
import RatingPage from "./components/RatingPage"
import * as serviceWorker from './serviceWorker';
import Product from "./components/Product";
import ShoppingCart from "./components/ShoppingCart";
import CheckOut from "./components/CheckOut";
import Admin from "./components/Admin";
import {CookiesProvider} from "react-cookie";

ReactDOM.render(
    <CookiesProvider>
        <React.StrictMode>
            <App/>
            {/*{products.map((id, product) => <Product name={product.name} rate={product.rate}/>)}*/}
        </React.StrictMode>
    </CookiesProvider>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();


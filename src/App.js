import React, {useEffect, useState} from 'react';
import './App.css';
import 'antd/dist/antd.css';
import {BrowserRouter as Router, Switch, Route, Link} from 'react-router-dom';
import {Layout, Menu, Input, notification} from 'antd';
import Title from 'antd/lib/typography/Title';
import {
    UserOutlined,
    LoginOutlined,
    UserAddOutlined,
    ShoppingCartOutlined,
    LogoutOutlined,
    ReadOutlined,
    FireOutlined,
    FireFilled
} from '@ant-design/icons';
import Login from "./components/Login";
import Registration from "./components/Registration";
import ShoppingCart from "./components/ShoppingCart";
import Category from "./components/Category";
import CheckOut from "./components/CheckOut";
import RatingPage from "./components/RatingPage";
import Admin from "./components/Admin";
import Product from "./components/Product";
import EditProduct from "./components/EditProduct";
import LikedProducts from "./components/LikedProducts";
import axios from 'axios';
// add liked products to upper bar
const {Search} = Input;
const {Header, Content, Sider} = Layout;

function App() {
    const [user, setUser] = useState(null);
    const [products, setSearchedProducts] = useState([]);

    useEffect(() => {
        axios.get('http://localhost:3001/connected-user', {withCredentials: true})
            .then(res => {
                if (res) setUser(res.data)
            })
            .catch(err => notification.error({message: "Error: " + err}))
    }, []);

    const searchProducts = searchString => {
        fetch('http://localhost:3001/search/product', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                query: searchString
            })
        })
            .then(res => res.json())
            .then(data => {
                setSearchedProducts(data);

            }).catch(err => notification.error("Error: " + err))
    };

    const logout = () => {
        setUser(null);
        fetch('http://localhost:3001/logout', {
            method: 'POST', // or 'PUT'
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        })
            .then(response => response.json())
            .catch(error => notification.error({message: 'Error: ' + error}));
    };
    return (
        <Router>
            <div className="App">
                <Layout>
                    <Header style={{
                        position: 'fixed', zIndex: 1, width: '100%', display: "flex",
                        alignItems: "center", justifyContent: "space-between"
                    }}>
                        <Title level={1}>
                            <Link to="/" style={{color: "white"}}>Flint</Link>
                        </Title>
                        <div className="search1">
                            <Search
                                placeholder="search"
                                onSearch={searchProducts}
                                style={{width: 300}}
                            />
                        </div>

                        <div>
                            {!user ? <Menu theme="dark" mode="horizontal"><Menu.Item icon={<ReadOutlined/>} key="1"
                                                                                     defaultSelectedKeys={[]}>
                                    <Link to="/login">ReadMe</Link>
                                </Menu.Item>
                                    <Menu.Item icon={<LoginOutlined/>} key="2">
                                        <Link to="/login">Login</Link>
                                    </Menu.Item>
                                    <Menu.Item icon={<UserAddOutlined/>} key="3">
                                        <Link to="/register">Registerion</Link>
                                    </Menu.Item></Menu> :
                                user.permission_level !== 1 ?
                                    <Menu theme="dark" mode="horizontal" defaultSelectedKeys={[]}>
                                        <Menu.Item icon={<UserOutlined/>} key="0">Hello {user.name}
                                        </Menu.Item>
                                        <Menu.Item icon={<FireFilled/>} key="1">
                                            <Link to="/likedproducts">Liked Products</Link>
                                        </Menu.Item>
                                        <Menu.Item icon={<LogoutOutlined/>} key="2" onClick={logout}>
                                            Logout
                                        </Menu.Item>
                                        <Menu.Item icon={<ShoppingCartOutlined/>} key="3">
                                            <Link to="/ShoppingCart">cart</Link>
                                        </Menu.Item>
                                    </Menu> :
                                    <Menu theme="dark" mode="horizontal" defaultSelectedKeys={[]}>
                                        <Menu.Item key="0">Hello Admin {user.name}
                                        </Menu.Item>
                                        <Menu.Item icon={<UserOutlined/>} key="1">
                                            <Link to="/Admin">Users</Link>
                                        </Menu.Item>
                                        <Menu.Item icon={<FireFilled/>} key="2">
                                            <Link to="/likedproducts">Liked Products</Link>
                                        </Menu.Item>
                                        <Menu.Item icon={<LogoutOutlined/>} key="3" onClick={logout}>
                                            Logout
                                        </Menu.Item>
                                        <Menu.Item icon={<ShoppingCartOutlined/>} key="4">
                                            <Link to="/ShoppingCart">Cart</Link>
                                        </Menu.Item>
                                    </Menu>

                            }

                        </div>
                    </Header>
                    <Layout>
                        {user && <Sider trigger={null}>
                            <div className="logo"/>
                            <Menu theme="dark" mode="inline" defaultSelectedKeys={[]}>
                                <Menu.Item key="0" icon={<UserOutlined/>}>
                                    nav
                                </Menu.Item>
                                <Menu.Item key="1">
                                    <Link to="/camping_accessories">Camping Accessories</Link>
                                </Menu.Item>
                                <Menu.Item key="2">
                                    <Link to="/clothing">Clothing</Link>
                                </Menu.Item>
                                <Menu.Item key="3">
                                    <Link to="/culinary">Culinary</Link>
                                </Menu.Item>
                                <Menu.Item key="4">
                                    <Link to="/hiking_gear">Hiking gear</Link>
                                </Menu.Item>
                                <Menu.Item key="5">
                                    <Link to="/storage">Storage</Link>
                                </Menu.Item>
                                <Menu.Item key="6">
                                    <Link to="/all_products">All Products</Link>
                                </Menu.Item>
                            </Menu>
                        </Sider>}


                        <Content style={{minHeight: "100vh"}}>
                            <Switch>
                                <Route path="/login">
                                    <Login setUser={setUser}/>
                                </Route>
                                <Route path="/register">
                                    <Registration user={'bla'}/>
                                </Route>
                            </Switch>
                            {user && <Switch>
                                <Route exact path="/">
                                    <div className="content">
                                        {products.length ? products.map(product =>
                                            <Product key={product.id}
                                                     user={user}
                                                     id={product.id}
                                                     setUser={setUser}
                                                     name={product.name}
                                                     price={product.price}
                                                     image={product.image}
                                                     rating={product.rating}
                                                     description={product.description}
                                            />) : ''};
                                    </div>
                                </Route>
                                <Route exact path={'/camping_accessories'}>
                                    <Category name={'camping_accessories'} user={user} setUser={setUser}/>
                                </Route>
                                <Route exact path={'/clothing'}>
                                    <Category name={'clothing'} user={user} setUser={setUser}/>
                                </Route>
                                <Route exact path={'/culinary'}>
                                    <Category name={'culinary'} user={user} setUser={setUser}/>
                                </Route>
                                <Route path={'/hiking_gear'}>
                                    <Category name={'hiking_gear'} user={user} setUser={setUser}/>
                                </Route>
                                <Route path={'/storage'}>
                                    <Category name={'storage'} user={user} setUser={setUser}/>
                                </Route>
                                <Route path={'/all_products'}>
                                    <Category name={"all"} user={user} setUser={setUser}/>
                                </Route>
                                <Route path={"/ShoppingCart"}>
                                    <ShoppingCart cart={user.cart} user={user} setUser={setUser}/>
                                </Route>
                                <Route path={"/likedproducts"}>
                                    <LikedProducts products={user.products_liked} user={user} setUser={setUser}/>
                                </Route>
                                <Route exact path={"/CheckOut"}>
                                    <CheckOut cart={user.cart}/>
                                </Route>
                                <Route path={"/edit/:productID"} component={EditProduct}>
                                </Route>
                                <Route path={'/RatingPage/:productName/:productID'} component={RatingPage}/>
                                <Route path={'/Admin'}>
                                    <Admin/>
                                </Route>
                            </Switch>}
                        </Content>
                    </Layout>
                </Layout>
            </div>
        </Router>

    );
}


export default App;
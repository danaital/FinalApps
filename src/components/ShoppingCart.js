import React, {useEffect, useState} from 'react';
import {Layout, Breadcrumb, Row, Col, Table, Space, Divider, Statistic, Button, Form, Input} from 'antd';
import {DeleteOutlined, ShoppingOutlined} from '@ant-design/icons';
import Title from "antd/lib/typography/Title";
import {BrowserRouter as Router, Redirect} from "react-router-dom";
import axios from 'axios';

const {Content} = Layout;

const ShopppingCart = ({user, setUser}) => {
    const [cart, setCart] = useState([]);
    const amountColumn = (amount, record) =>
        <div style={{alignItems: 'center', display: 'inline-flex'}}>
            <Button onClick={() => changeProductAmount(record.id, 'removeone')}>-</Button>
            {amount}
            <Button onClick={() => changeProductAmount(record.id, 'addone')}>+</Button>
        </div>

    useEffect(() => {
        setCart(user.cart.map(product => ({
                ...product.product,
                quantity: product.quantity,
                total: product.product.price * product.quantity
            }))
        )
    }, [user]);

    const changeProductAmount = (productID, action) => {
        axios.post(`http://localhost:3001/cart/${productID}/${action}`, {}, {withCredentials: true})
            .then(res => {
                setUser({...user, cart: res.data})
            })
    }

    const onClear = () => {
        fetch("http://localhost:3001/cart/emptycart",
            {
                method: 'POST', // or 'PUT'
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            })
            .then(response => response.json())
            .then(data => {
                setUser({...user, cart: []})
                console.log('Success:', data);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    };
    const columns = [
        {
            title: 'Product',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: '',
            dataIndex: 'id',
            key: 'id',
            render: id => <p style={{display: "none"}}>{id}</p>
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
        },
        {
            title: 'Amount',
            dataIndex: 'quantity',
            key: 'quantity',
            render: amountColumn
        }, {
            title: 'Total Price',
            dataIndex: 'total',
            key: 'total',
        },
    ];

    return (
        <Router>
            <div>
                <Layout>
                    <br></br>
                    <Content className='site-layout-background'>
                        <header><Title style={{
                            color: 'BLACK', position: 'fixed',
                            marginLeft: '450px',
                            marginRight: '300px',
                            marginTop: '20px'
                        }} level={2}>Shopping Cart</Title>
                        </header>
                        <Row justify='end'>
                            <Col>
                                <Button type='default' onClick={onClear} danger>
                                    <DeleteOutlined/>
                                    <span>Delete Cart</span>
                                </Button>
                            </Col>
                        </Row>
                        <Table columns={columns} dataSource={cart} pagination={false}/>
                        <Row justify='start'>

                        </Row>
                        <Row justify='end'>
                            <Col>
                                <Button style={{
                                    marginTop: 16, marginLeft: '500px',
                                    marginRight: '600px'
                                }} type='primary' onClick={() => window.location.href = "/CheckOut"} disabled={!user.cart.length}>
                                    Check out <ShoppingOutlined/>
                                </Button>
                            </Col>
                        </Row>
                    </Content>
                </Layout>
            </div>
        </Router>
    );
};


export default ShopppingCart;
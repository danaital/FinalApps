import React, {useEffect, useState} from 'react';
import 'antd/dist/antd.css'
import {Layout, Menu, Breadcrumb, Button, PageHeader, Input, AutoComplete, Rate, Row, Col, Table,Divider} from 'antd';

import { Space, Card } from 'antd';
import Title from "antd/lib/typography/Title";
import {CreditCardOutlined, DeleteOutlined} from "@ant-design/icons";
import Product from "./Product";
import ShopppingCart from "./ShoppingCart";
const { Content } = Layout;


function CartRow(props) {
    // const [products, setProducts] = useState([]);
    // const [user, setUser]= useState(null);
    // const [cart, setCart]= useState(null);
    // useEffect(() => {
    //     console.log(document.cookie)
    // }, [user])
    let cartrow= props;

    return (
        <div style={{background:'lightgrey', marginTop: '100px'}}>

            <Divider orientation="left">Normal</Divider>
            <Row>
                <Col span={6} order={6}>
                    {cartrow.image}
                </Col>
                <Col span={6} order={5}>
                    {cartrow.name}
                </Col>
                <Col span={6} order={4}>
                    {cartrow.description}
                </Col>
                <Col span={6} order={3}>
                    {cartrow.price}
                </Col>
                <Col span={6} order={2}>
                    {cartrow.quantity}
                </Col>
                <Col span={6} order={1}>
                    {cartrow.total}
                </Col>
            </Row>
        </div>

    );
};

export default CartRow;
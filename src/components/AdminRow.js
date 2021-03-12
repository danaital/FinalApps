import React, {useEffect, useState} from 'react';
import 'antd/dist/antd.css'
import {Layout, Menu, Breadcrumb, Button, PageHeader, Input, AutoComplete, Rate, Row, Col, Table, Divider} from 'antd';

function AdminRow(props) {
    // const [products, setProducts] = useState([]);
    // const [user, setUser]= useState(null);
    // const [cart, setCart]= useState(null);
    // useEffect(() => {
    //     console.log(document.cookie)
    // }, [user])
    //
    // const logout = ()=> {
    //     setUser(null);
    // }
    let user = props;
    return (
            <div style={{background:'lightgrey', marginTop: '100px'}}>
                {/*<section className="category">*/}



                {/*</section>*/}
                <Divider></Divider>
                <Row>
                    <Col span={6} order={1}>
                        {user.name}
                    </Col>
                    <Col span={6} order={2}>
                        {user.email}
                    </Col>
                    <Col span={6} order={3}>
                        {/*{user.logins[user.logins.length-1]}*/}
                        {!user.lastLogin? "Never":user.lastLogin}
                    </Col>
                    <Col span={6} order={3}>
                        {/*{user.logins}*/}
                        {user.history}
                    </Col>
                    <Col span={6} order={4}>
                        {/*{user.purchases[user.purchases.length-1]}*/}
                        {user.lastPurchase}
                    </Col>
                    <Col span={6} order={5}>
                        {/*{user.purchases}*/}
                        {user.fullHistory}
                    </Col>
                </Row>

            </div>

        );
    };

    export default AdminRow;
import React, {useState, useEffect} from 'react';
import {Layout, Row, Col, Table} from 'antd';
import Title from "antd/lib/typography/Title";
import {BrowserRouter as Router} from "react-router-dom";

const {Content} = Layout;


const Admin = () => {
    const [users, setUsers] = useState([]);
    const getUsers = () => {
        fetch('http://localhost:3001/admin/users', {
            method: 'POST', // or 'PUT'
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({}),
        }).then(res => res.json())
            .then(data => setUsers(data.map(user => ({...user, lastLogin: user.logins[user.logins.length -1]}))))
    };
    useEffect(getUsers, []);
    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            filters: users.map(user => ({text: user.name, value: user.name})),
            onFilter: (value, record) => record.name.indexOf(value) === 0,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Last Login',
            dataIndex: 'lastLogin',
            key: 'lastLogin',
        }, {
            title: 'Full History Of Login',
            dataIndex: 'logins',
            key: 'logins',
            render: logins => logins.map(login => <div>{login}</div>)
        },
        {
            title: 'Full History Of Purchase',
            dataIndex: 'purchases',
            key: 'purchases',
            render: purchases => purchases.map(purchase => <div>Price: {purchase.price}, Date: {purchase.date}</div>)
        },
    ];

    console.log(users);
    return (
        <Router>
            <section>
                <div>
                    <Layout>
                        <br></br>
                        <br></br>
                        <br></br>
                        <br></br>
                        <Content className='site-layout-background'>
                            <header><Title style={{
                                color: 'BLACK', position: 'fixed',
                                marginLeft: '600px',
                                marginRight: '300px',
                                marginTop: '20px'
                            }} level={2}>Users</Title>
                            </header>
                            <br></br>
                            <br></br>
                            <Row justify='end'>
                                <Col>
                                </Col>
                            </Row>
                            <br></br>
                            <Table columns={columns} dataSource={users} pagination={false}/>
                            <Row justify='start'>

                            </Row>
                            <br></br>
                            <Row justify='end'>
                                <Col>
                                </Col>
                            </Row>
                        </Content>
                    </Layout>
                </div>
            </section>
        </Router>

    );
};


export default Admin;